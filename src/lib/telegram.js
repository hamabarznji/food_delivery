import 'server-only';

// Escape for MarkdownV2 (outside of code spans)
const escapeMarkdown = (text) => String(text ?? '').replace(/([_*[\]()~`>#+=|{}.!\\-])/g, '\\$1');
// Inside code spans / blocks only ` and \ are special
const escapeCode = (text) => String(text ?? '').replace(/([`\\])/g, '\\$1');
const formatIQD = (value) => Number(value || 0).toLocaleString('en-US');

function chatIds() {
  const list = (process.env.TELEGRAM_CHAT_IDS || '').split(',').map((s) => s.trim());
  // legacy variable names from the original deployment
  return [...new Set([...list, process.env.id1, process.env.id2].filter(Boolean))];
}

// Notify the restaurant's Telegram chats about a new order. `order` must be
// loaded from the database (never from client input). Failures are logged and
// never block the order itself.
export async function notifyNewOrder(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chats = chatIds();
  if (!token || chats.length === 0) return false;

  const items = order.order_items || [];
  const nameWidth = Math.max(12, ...items.map((it) => (it.name_ku || it.name_en).length));
  const lines = items.flatMap((it) => {
    const name = (it.name_ku || it.name_en).padEnd(nameWidth, ' ');
    const row = `• ${name}  x${String(it.quantity).padStart(3, ' ')}  - ${formatIQD(it.line_total)}`;
    const extras = (it.options || []).map((o) => `    + ${o.name_ku || o.name_en}`);
    return [row, ...extras];
  });
  const itemsBlock = '```\n' + escapeCode(lines.join('\n') || '(no items)') + '\n```';

  const when = new Date(order.created_at).toLocaleString('en-GB', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const row = (emoji, label, value) => `${emoji} *${escapeMarkdown(label)}:* ${value}\n`;

  const message =
    `🍽️ *${escapeMarkdown(`داواکاری نوێ #${order.order_number}`)}*\n\n` +
    row('🏪', 'چێشتخانە', escapeMarkdown(order.restaurant?.name_ku || order.restaurant?.name_en || '-')) +
    row('👤', 'ناو', escapeMarkdown(order.customer_name)) +
    row('📱', 'ژمارەی مۆبایل', `\`${escapeCode(`‎${order.customer_phone}`)}\``) +
    row('🏢', 'باڵەخانە', escapeMarkdown([order.location_label, order.address_details].filter(Boolean).join(' - '))) +
    row('💬', 'تێبینی', escapeMarkdown(order.comment || '-')) +
    `\n📋 *${escapeMarkdown('داواکارییەکان')}:*\n${itemsBlock}\n\n` +
    row('🧾', 'کۆی خواردنەکان', escapeMarkdown(formatIQD(order.subtotal))) +
    row('🛵', 'گەیاندن', escapeMarkdown(formatIQD(order.delivery_fee))) +
    (order.discount > 0 ? row('🎟️', `داشکاندن ${order.promo_code || ''}`.trim(), escapeMarkdown(`-${formatIQD(order.discount)}`)) : '') +
    `💰 *${escapeMarkdown('کۆی گشتی')}:* *${escapeMarkdown(formatIQD(order.total))}*\n\n` +
    `⏰ *${escapeMarkdown('کاتی داواکاری')}:* \`${escapeCode(when)}\``;

  const results = await Promise.allSettled(
    chats.map(async (chat_id) => {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ chat_id, text: message, parse_mode: 'MarkdownV2', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
    })
  );
  results.filter((r) => r.status === 'rejected').forEach((r) => console.error('Telegram notification failed:', r.reason?.message));
  return results.some((r) => r.status === 'fulfilled');
}
