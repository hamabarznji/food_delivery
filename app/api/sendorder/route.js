export async function POST(req) {
  try {
    const { orderDetails } = await req.json();

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = [process.env.id1];

    const message = `🍽️ *New Order*\n\n` +
      `👤 Name: ${orderDetails.customerName}\n` +
      `📱 Phone: ${orderDetails.phone}\n` +
      `🏢 Building: ${orderDetails.building}\n` +
      `🏠 Floor: ${orderDetails.floor}\n\n` +
      `📋 Items:\n${orderDetails.items}\n\n` +
      `💰 Total: $${orderDetails.total}\n\n` +
      `⏰ Time: ${new Date().toLocaleString()}`;

    for (const chatId of TELEGRAM_CHAT_ID) {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Telegram error: ${text}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
}
