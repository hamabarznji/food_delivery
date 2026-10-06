import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSession, getSupabaseServer } from './supabase/server';

// Gate for dashboard pages. UX only: the database enforces the same rules via RLS.
export const requireStaff = cache(async () => {
  const session = await getSession();
  if (!session.user) redirect('/login?next=/dashboard');
  const role = session.profile?.role;
  if (role !== 'vendor' && role !== 'admin') redirect('/');

  const supabase = await getSupabaseServer();
  let query = supabase.from('restaurants').select('id, slug, name_en, name_ar, name_ku, logo_url, is_active').order('created_at');
  if (role !== 'admin') query = query.eq('owner_id', session.user.id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return { ...session, role, isAdmin: role === 'admin', restaurants: data };
});
