import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/src/lib/supabase/server';
import { safeNext } from '@/src/lib/format';

const OTP_TYPES = ['signup', 'recovery', 'invite', 'magiclink', 'email', 'email_change'];

// Landing point for links in auth e-mails (confirm sign-up, reset password).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeNext(searchParams.get('next'), type === 'recovery' ? '/reset-password' : '/');

  const supabase = await getSupabaseServer();
  let error = { message: 'missing token' };
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && OTP_TYPES.includes(type)) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  }

  return NextResponse.redirect(new URL(error ? '/login?error=link' : next, origin));
}
