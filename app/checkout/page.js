import { getSupabaseServer } from '@/src/lib/supabase/server';
import { getI18n } from '@/src/i18n/server';
import CheckoutForm from './form';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('checkout.title') };
}

export default async function CheckoutPage() {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from('delivery_locations')
    .select('id, name_en, name_ar, name_ku')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return <CheckoutForm locations={data} />;
}
