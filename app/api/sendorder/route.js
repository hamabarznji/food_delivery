import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const orderDetails = await req.json();
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

    const message = `🍽️ *ئۆردەری نوێ*\n\n` +
      `👤 *ناو:* ${orderDetails.customerName}\n` +
      `📱 *ژمارەی مۆبایل:* ${orderDetails.phone}\n` +
      `🏢 *باڵەخانە:* ${orderDetails.building}\n` +
      `🏠 *نهۆم:* ${orderDetails.floor}\n\n` +
      `📋 *داواکارییەکان:*\n${orderDetails.items}\n\n` +
      `💰 *کۆی گشتی:* $${orderDetails.total}\n\n` +
      `⏰ *کاتی ئۆردەر:* ${new Date().toLocaleString()}`;

    for (const chatId of TELEGRAM_CHAT_ID) {
      const res = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to send to chat_id: ${chatId}`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telegram API error:', err);
    return NextResponse.json({ ok: false, error: err.message });
  }
}
