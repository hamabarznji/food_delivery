export async function POST(req) {
  try {
    const { orderDetails = {} } = await req.json();

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_IDS = [process.env.id1, process.env.id2].filter(Boolean);

    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHAT_IDS.length === 0) {
      throw new Error("Telegram credentials not configured.");
    }

    // Escape for MarkdownV2 (outside of triple backticks)
    const escapeMarkdown = (text) =>
      String(text ?? "").replace(/([_*[\]()~`>#+=|{}.!-])/g, "\\$1");

    // Enforce LTR for phone + strip spaces
    const formatPhone = (phone) => {
      if (!phone) return "";
      const digits = String(phone).replace(/\s+/g, "");
      return `\u200E${digits}`;
    };

    // Price format: "12,345 IQD"
    const formatIQD = (value) =>
      `${Number(value || 0).toLocaleString("en-US")}`;

    // Normalize items from array OR newline string
    // Accepts:
    //   [{ name, qty, price }]  // price can be line total OR unit price
    // OR
    //   "Stuffed Kebab x1 - 4000\nChicken Shawarma x2 - 2000"
    const normalizeItems = (items) => {
      if (!items) return [];

      // If it's already an array of objects
      if (Array.isArray(items)) {
        return items
          .map((it) => {
            const name = String(it.name ?? "").trim();
            const qty = Number(it.qty ?? it.quantity ?? 1) || 1;
            const unit = Number(it.unitPrice ?? it.unit ?? 0) || undefined;
            const line = Number(it.total ?? it.price ?? 0) || 0;
            const lineTotal = unit ? unit * qty : line;
            return name ? { name, qty, lineTotal } : null;
          })
          .filter(Boolean);
      }

      // Else, try to parse a string list
      const lines = String(items)
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      const rx =
        /^(?:[-•▫️\u2022]?\s*)?(.+?)(?:\s*[xX×]\s*(\d+))?(?:\s*[-–—:]\s*)?(\d[\d,\.]*)?$/;

      return lines
        .map((line) => {
          const m = line.match(rx);
          if (!m) return null;
          const name = (m[1] || "").trim();
          const qty = Number(m[2] || 1) || 1;
          const priceNum = m[3]
            ? Number(String(m[3]).replace(/,/g, ""))
            : 0;
          return name ? { name, qty, lineTotal: priceNum } : null;
        })
        .filter(Boolean);
    };

    const items = normalizeItems(orderDetails.items);
    const calcTotal =
      items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0) || 0;
    const grandTotal =
      Number(orderDetails.total ?? orderDetails.grandTotal ?? calcTotal) || 0;

    // Build a tidy monospaced items block
    // (No Markdown escaping inside triple backticks)
    const nameWidth = Math.max(
      12,
      ...items.map((it) => it.name.length).concat([0])
    );
    const qtyWidth = 3;

    const itemsBlockLines = items.length
      ? items.map((it) => {
          const name = it.name.padEnd(nameWidth, " ");
          const qty = String(it.qty).padStart(qtyWidth, " ");
          const priceStr = formatIQD(it.lineTotal);
          return `• ${name}  x${qty}  - ${priceStr}`;
        })
      : ["(no items)"];

    const itemsBlock = "```\n" + itemsBlockLines.join("\n") + "\n```";

    // Header / meta (escaped)
    const now = new Date();
    const when = now.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const message =
      `🍽️ *${escapeMarkdown("داواکاری نوێ")}*\n\n` +
      `👤 *${escapeMarkdown("ناو")}:* ${escapeMarkdown(orderDetails.name || "-")}\n` +
      `📱 *${escapeMarkdown("ژمارەی مۆبایل")}:* \`${escapeMarkdown(
        formatPhone(orderDetails.phone || "")
      )}\`\n` +
      `🏢 *${escapeMarkdown("باڵەخانە")}:* ${escapeMarkdown(
        orderDetails.building || "-"
      )}\n` +
      `💬 *${escapeMarkdown("تێبینی")}:* ${escapeMarkdown(
        orderDetails.floor || "-"
      )}\n\n` +
      `📋 *${escapeMarkdown("داواکارییەکان")}:*\n` +
      `${itemsBlock}\n\n` +
      `💰 *${escapeMarkdown("کۆی گشتی")}:* *${escapeMarkdown(
        formatIQD(grandTotal)
      )}*\n\n` +
      `⏰ *${escapeMarkdown("کاتی داواکاری")}:* \`${escapeMarkdown(when)}\``;

    // Send to all chat IDs
    for (const chat_id of TELEGRAM_CHAT_IDS) {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            chat_id,
            text: message,
            parse_mode: "MarkdownV2",
            disable_web_page_preview: true,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`Telegram error for chat ${chat_id}:`, text);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("API Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}
