import { getSupabaseServer } from '@/src/lib/supabase/server';
import { getI18n } from '@/src/i18n/server';
import { EmptyState } from '@/src/components/ui';
import RestaurantView from '@/src/components/restaurant/view';

// The home page is the menu: customers land straight on what they can order.
export default async function HomePage() {
  const supabase = await getSupabaseServer();
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);

  if (!restaurant) {
    const { t } = await getI18n();
    return (
      <div className="container-page py-16">
        <EmptyState title={t('home.emptyTitle')} body={t('home.emptyBody')} />
      </div>
    );
  }
  return <RestaurantView restaurant={restaurant} />;
}
