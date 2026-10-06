import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import fs from 'fs/promises';
import path from 'path';

const menuFilePath = path.join(process.cwd(), 'data', 'menu.json');

export async function GET() {
  try {
    const raw = await fs.readFile(menuFilePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    // Fallback if data/menu.json doesn't exist
    try {
      const en = (await import('@/public/en')).default;
      const ar = (await import('@/public/ar')).default;
      const krd = (await import('@/public/ku-sor')).default;
      const data = { en, ar, krd };
      return NextResponse.json({ success: true, data });
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Failed to load menu' }, { status: 500 });
    }
  }
}

export async function POST(req) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');

    if (session?.value !== 'authenticated') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: login required to update menu / پێویستە بچیتە ژوورەوە' },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body?.data) {
      return NextResponse.json({ success: false, error: 'Invalid menu data' }, { status: 400 });
    }

    await fs.mkdir(path.dirname(menuFilePath), { recursive: true });
    await fs.writeFile(menuFilePath, JSON.stringify(body.data, null, 2), 'utf-8');

    return NextResponse.json({ success: true, message: 'Menu updated successfully!' });
  } catch (err) {
    console.error('Menu save error:', err);
    return NextResponse.json({ success: false, error: 'Failed to save menu' }, { status: 500 });
  }
}
