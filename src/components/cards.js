'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { isRestaurantOpen, loc } from '@/src/lib/format';
import { useI18n } from './providers';
import { useCart } from './cart';
import { Badge, FoodImage, Price, Spinner, cx } from './ui';

export function OpenBadge({ restaurant, className }) {
  const { t } = useI18n();
  const open = isRestaurantOpen(restaurant);
  if (!open) return <Badge tone="dark" className={className}>{t('restaurant.closed')}</Badge>;
  if (restaurant.status === 'busy') return <Badge tone="warning" className={className}>{t('restaurant.busy')}</Badge>;
  return <Badge tone="success" className={className}>{t('restaurant.open')}</Badge>;
}

// item.option_groups (array, may be empty) tells us whether a quick add is possible.
export function FoodCard({ item, restaurant }) {
  const { t, lang } = useI18n();
  const { add, openItem } = useCart();
  const [adding, setAdding] = useState(false);
  const name = loc(item, 'name', lang);
  const description = loc(item, 'description', lang);
  const orderable = item.is_available && isRestaurantOpen(restaurant);
  const hasOptions = (item.option_groups?.length || 0) > 0;

  const quickAdd = async (e) => {
    e.stopPropagation();
    if (hasOptions) return openItem(item, restaurant);
    setAdding(true);
    await add(item, [], 1);
    setAdding(false);
  };

  return (
    <article className={cx('card relative flex gap-4 p-3 transition-shadow hover:shadow-lift', !item.is_available && 'opacity-60')}>
      <div className="min-w-0 flex-1 py-1 ps-1">
        <h3 className="font-bold text-ink-900">
          <button type="button" onClick={() => openItem(item, restaurant)} className="text-start after:absolute after:inset-0 after:rounded-2xl">
            {name}
          </button>
        </h3>
        {description && <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink-500">{description}</p>}
        <div className="mt-3 flex items-center gap-2">
          <Price value={item.price} className="font-bold text-brand-700" />
          {!item.is_available && <Badge>{t('item.unavailable')}</Badge>}
        </div>
      </div>
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-100 sm:h-32 sm:w-32">
        <FoodImage src={item.image_url} alt="" sizes="128px" />
        <div className="absolute bottom-1.5 end-1.5 z-10">
          <button
            type="button"
            onClick={quickAdd}
            disabled={!orderable || adding}
            aria-label={`${t('item.add')}: ${name}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-[transform,background-color] hover:scale-110 hover:bg-brand-700 active:scale-95 disabled:pointer-events-none disabled:bg-ink-300"
          >
            {adding ? <Spinner size={18} className="text-white" /> : <Plus size={20} aria-hidden />}
          </button>
        </div>
      </div>
    </article>
  );
}
