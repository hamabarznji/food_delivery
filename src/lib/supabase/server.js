import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from './config';

// Server client bound to the request's session cookies. It uses the anon key
// plus the user's JWT, so RLS applies exactly as it does in the browser.
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // called from a Server Component: the middleware refreshes cookies instead
        }
      },
    },
  });
}

// The verified user and their profile for this request (deduplicated).
export const getSession = cache(async () => {
  if (!isSupabaseConfigured) return { user: null, profile: null };
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, avatar_url, role')
    .eq('id', user.id)
    .maybeSingle();
  return { user: { id: user.id, email: user.email }, profile };
});
