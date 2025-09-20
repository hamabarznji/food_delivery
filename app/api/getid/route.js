// app/api/testtelegram/route.js
export async function GET() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.id1; // single chat ID for testing

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: 'Test message from production!' }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: data }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true, result: data }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500 });
  }
}
