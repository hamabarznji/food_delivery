import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || 'pasha2026';

    if (password && password.trim() === adminPassword.trim()) {
      const response = NextResponse.json({ success: true, message: 'Logged in successfully' });
      response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Incorrect password / وشەی نهێنی هەڵەیە' },
      { status: 401 }
    );
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Login error' }, { status: 500 });
  }
}
