import { Bike, Clock, MapPin, Phone, ShoppingBasket } from 'lucide-react';
import { getSupabaseServer } from '@/src/lib/supabase/server';
import { getI18n } from '@/src/i18n/server';
import { ITEM_CARD } from '@/src/lib/queries';
import { formatIQD, loc, shortTime } from '@/src/lib/format';
import { FoodImage } from '@/src/components/ui';
import { OpenBadge } from '@/src/components/cards';
import RestaurantMenu from './menu';

// keep "1,000 IQD" left-to-right inside Kurdish / Arabic sentences
const ltr = (text) => `⁦${text}⁩`;

// The storefront: restaurant header + full menu with the cart alongside.
export default async function RestaurantView({ restaurant }) {
  const { t, lang } = await getI18n();
  const supabase = await getSupabaseServer();

  const [categories, items] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name_en, name_ar, name_ku, note_en, note_ar, note_ku')
      .eq('restaurant_id', restaurant.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('menu_items')
      .select(ITEM_CARD)
      .eq('restaurant_id', restaurant.id)
      .is('archived_at', null)
      .order('sort_order')
      .order('created_at'),
  ]);
  const failed = [categories, items].find((r) => r.error);
  if (failed) throw new Error(failed.error.message);

  const facts = [
    [Clock, t('restaurant.prep', { n: restaurant.prep_minutes })],
    [Bike, `${t('restaurant.delivery')}: ${restaurant.delivery_fee === 0 ? t('common.free') : ltr(formatIQD(restaurant.delivery_fee))}`],
    restaurant.min_order > 0 && [ShoppingBasket, `${t('restaurant.minOrder')}: ${ltr(formatIQD(restaurant.min_order))}`],
    restaurant.opens_at && restaurant.closes_at && [Clock, `${t('restaurant.hours')}: ${ltr(`${shortTime(restaurant.opens_at)} – ${shortTime(restaurant.closes_at)}`)}`],
    restaurant.location && [MapPin, restaurant.location],
    restaurant.phone && [
      Phone,
      restaurant.phone.includes('0771 101 05 00')
        ? ltr(restaurant.phone)
        : ltr(`${restaurant.phone} - 0771 101 05 00`),
    ],
  ].filter(Boolean);

  return (
    <>
      <div className="relative h-44 overflow-hidden bg-ink-200 sm:h-60 lg:h-72">
        <FoodImage src={restaurant.cover_url} alt="" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-ink-900/10 to-transparent" aria-hidden />
      </div>

      <div className="container-page">
        <div className="card relative -mt-12 p-5 sm:-mt-16 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative -mt-12 h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-card sm:mt-0 sm:h-24 sm:w-24">
              <FoodImage src={restaurant.logo_url || restaurant.cover_url} alt="" sizes="96px" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{loc(restaurant, 'name', lang)}</h1>
                <OpenBadge restaurant={restaurant} />
              </div>
              {loc(restaurant, 'description', lang) && (
                <p className="mt-1.5 max-w-2xl text-sm text-ink-600">{loc(restaurant, 'description', lang)}</p>
              )}
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-ink-700">
                {facts.map(([Icon, text]) => (
                  <li key={text} className="inline-flex items-center gap-1.5">
                    <Icon size={15} className="text-brand-600" aria-hidden />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <RestaurantMenu restaurant={restaurant} categories={categories.data} items={items.data} />
      </div>
    </>
  );
}
