import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// Customers order as guests; only staff areas need a session.
const PROTECTED = ['/account', '/dashboard'];
const GUEST_ONLY = ['/login', '/forgot-password'];

// Refreshes the Supabase session on every request and keeps signed-out users
// away from private pages. Role checks happen in the dashboard layout and,
// authoritatively, in the database (RLS).
export async function middleware(request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const matches = (list) => list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const redirect = (to) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && matches(PROTECTED)) {
    return redirect(`/login?next=${encodeURIComponent(pathname + search)}`);
  }
  if (user && matches(GUEST_ONLY)) return redirect('/dashboard');

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
