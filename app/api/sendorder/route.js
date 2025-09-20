export async function POST(req) {
  try {
    const { orderDetails } = await req.json();

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_IDS = [process.env.id1, process.env.id2];

    // Escape Markdown special characters so Telegram doesn't break
    const escapeMarkdown = (text) =>
      String(text || '')
        .replace(/([_*[\]()~`>#+=|{}.!-])/g, '\\$1');

    const message =
      `🍽️ *داواکاری نوێ*\n\n` +
      `👤 ناو: ${escapeMarkdown(orderDetails.name)}\n` +
      `📱 ژمارەی مۆبایل: ${escapeMarkdown(orderDetails.phone)}\n` +
      `🏢 باڵەخانە: ${escapeMarkdown(orderDetails.building)}\n` +
      `🏠 نهۆم: ${escapeMarkdown(orderDetails.floor)}\n\n` +
      `📋 داواکارییەکان:\n${escapeMarkdown(orderDetails.items)}\n\n` +
      `💰 کۆی گشتی: ${escapeMarkdown(orderDetails.total)} IQD\n\n` +
      `⏰ کاتی داواکاری: ${escapeMarkdown(new Date().toLocaleString())}`;

    for (const chatId of TELEGRAM_CHAT_IDS) {
      if (!chatId) continue;

      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'MarkdownV2',
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`Telegram error for chat ${chatId}:`, text);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('API Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
