'use client';

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, ShoppingBag, Trash2, Clock } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import { cartTotals, isRestaurantOpen, loc, unitPrice } from '@/src/lib/format';
import { useErrorMessage, useI18n, useToast } from './providers';
import { Button, EmptyState, FoodImage, FormError, Modal, Price, QuantityStepper, Skeleton, buttonClass, cx, useConfirm } from './ui';

const STORAGE_KEY = 'cart:v1';
const ITEM_FIELDS =
  'id, restaurant_id, name_en, name_ar, name_ku, description_en, description_ar, description_ku, price, image_url, is_available, prep_minutes';
const RESTAURANT_FIELDS =
  'id, slug, name_en, name_ar, name_ku, logo_url, delivery_fee, min_order, status, opens_at, closes_at, is_active';

const lineKey = (itemId, optionIds) => `${itemId}:${[...optionIds].sort().join(',')}`;

const readGuestCart = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((l) => l?.itemId && l.quantity > 0) : [];
  } catch {
    return [];
  }
};
const writeGuestCart = (lines) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // storage unavailable (private mode): cart lives for this page only
  }
};

// Attach current menu data to raw cart lines. Anything the public can no
// longer read (archived / unlisted) comes back flagged as unavailable.
async function hydrate(raw) {
  if (!raw.length) return [];
  const supabase = getSupabase();
  const itemIds = [...new Set(raw.map((l) => l.itemId))];
  const optionIds = [...new Set(raw.flatMap((l) => l.optionIds))];
  const [items, options] = await Promise.all([
    supabase.from('menu_items').select(`${ITEM_FIELDS}, restaurant:restaurants(${RESTAURANT_FIELDS})`).in('id', itemIds),
    optionIds.length
      ? supabase.from('options').select('id, name_en, name_ar, name_ku, price_delta, is_available').in('id', optionIds)
      : { data: [], error: null },
  ]);
  if (items.error) throw items.error;
  if (options.error) throw options.error;
  const itemMap = new Map(items.data.map((i) => [i.id, i]));
  const optionMap = new Map(options.data.map((o) => [o.id, o]));

  return raw.map((l) => {
    const item = itemMap.get(l.itemId) || null;
    const chosen = l.optionIds.map((id) => optionMap.get(id));
    const available = Boolean(item?.is_available && item.restaurant) && chosen.every((o) => o?.is_available);
    return {
      key: lineKey(l.itemId, l.optionIds),
      id: l.id || null,
      itemId: l.itemId,
      optionIds: l.optionIds,
      quantity: l.quantity,
      item,
      options: chosen.filter(Boolean),
      unitPrice: item ? unitPrice(item, chosen.filter(Boolean)) : 0,
      available,
    };
  });
}

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

// The cart lives in this browser (no account needed). It only stores item ids,
// option ids and quantities; names and prices always come from the database,
// and the order total is recomputed there when the order is placed.
export function CartProvider({ children }) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const [confirm, confirmDialog] = useConfirm();

  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return startTransition(() => setLoading(false));
    const request = ++requestRef.current;
    try {
      const raw = readGuestCart().map((l) => ({ ...l, optionIds: l.optionIds || [] }));
      const next = await hydrate(raw);
      // a transition, so the first load never interrupts hydration of streamed content
      if (request === requestRef.current) {
        startTransition(() => {
          setLines(next);
          setLoading(false);
        });
      }
    } catch (error) {
      if (request === requestRef.current) {
        toast.error(errorMessage(error));
        startTransition(() => setLoading(false));
      }
    }
  }, [toast, errorMessage]);

  useEffect(() => {
    load();
  }, [load]);

  const restaurant = useMemo(() => lines.find((l) => l.item?.restaurant)?.item.restaurant || null, [lines]);

  const saveGuest = (next) =>
    writeGuestCart(next.map((l) => ({ itemId: l.itemId, optionIds: l.optionIds, quantity: l.quantity })));

  const add = useCallback(
    async (item, optionIds = [], quantity = 1) => {
      const differentRestaurant = restaurant && restaurant.id !== item.restaurant_id;
      if (differentRestaurant) {
        const yes = await confirm({
          title: t('cart.replaceTitle'),
          body: t('cart.replaceBody', { name: loc(restaurant, 'name', lang) }),
          confirmLabel: t('cart.replaceConfirm'),
        });
        if (!yes) return false;
      }
      try {
        const base = differentRestaurant ? [] : readGuestCart();
        const key = lineKey(item.id, optionIds);
        const existing = base.find((l) => lineKey(l.itemId, l.optionIds || []) === key);
        if (existing) existing.quantity = Math.min(50, existing.quantity + quantity);
        else base.push({ itemId: item.id, optionIds: [...optionIds].sort(), quantity });
        writeGuestCart(base);
        await load();
        toast.success(t('item.added'));
        return true;
      } catch (error) {
        toast.error(errorMessage(error));
        return false;
      }
    },
    [restaurant, confirm, t, lang, load, toast, errorMessage]
  );

  const setQuantity = useCallback(
    (key, quantity) => {
      const next = quantity <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l));
      setLines(next);
      saveGuest(next);
    },
    [lines]
  );

  const clear = useCallback(() => {
    setLines([]);
    writeGuestCart([]);
  }, []);

  // Replace the whole cart (used by "order again").
  const replaceWith = useCallback(
    async (raw) => {
      writeGuestCart(raw);
      await load();
    },
    [load]
  );

  const totals = useMemo(() => cartTotals(lines.filter((l) => l.available), restaurant), [lines, restaurant]);
  const hasUnavailable = lines.some((l) => !l.available);

  const value = useMemo(
    () => ({
      lines,
      restaurant,
      totals,
      hasUnavailable,
      loading,
      add,
      setQuantity,
      remove: (key) => setQuantity(key, 0),
      clear,
      replaceWith,
      reload: load,
      openCart: () => setDrawerOpen(true),
      closeCart: () => setDrawerOpen(false),
      openItem: (item, itemRestaurant) => setActiveItem({ item, restaurant: itemRestaurant }),
    }),
    [lines, restaurant, totals, hasUnavailable, loading, add, setQuantity, clear, replaceWith, load]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <ItemModal active={activeItem} onClose={() => setActiveItem(null)} />
      {confirmDialog}
    </CartContext.Provider>
  );
}

// ---------------------------------------------------------------- summary rows
export function TotalsRows({ totals, restaurant, promoCode }) {
  const { t } = useI18n();
  const row = 'flex items-center justify-between text-sm';
  return (
    <dl className="space-y-2">
      <div className={row}>
        <dt className="text-ink-600">{t('cart.subtotal')}</dt>
        <dd className="font-medium"><Price value={totals.subtotal} /></dd>
      </div>
      <div className={row}>
        <dt className="text-ink-600">{t('cart.delivery')}</dt>
        <dd className="font-medium">
          {restaurant && totals.deliveryFee === 0 ? <span className="text-herb-600">{t('common.free')}</span> : <Price value={totals.deliveryFee} />}
        </dd>
      </div>
      {totals.discount > 0 && (
        <div className={cx(row, 'text-herb-700')}>
          <dt>
            {t('cart.discount')}
            {promoCode && <span className="ms-1.5 rounded bg-herb-50 px-1.5 py-0.5 text-xs font-semibold" dir="ltr">{promoCode}</span>}
          </dt>
          <dd className="font-medium" dir="ltr">− <Price value={totals.discount} /></dd>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-dashed border-ink-200 pt-3 text-base font-bold">
        <dt>{t('cart.total')}</dt>
        <dd className="text-brand-700"><Price value={totals.total} /></dd>
      </div>
    </dl>
  );
}

export function CartLine({ line, compact = false }) {
  const { t, lang } = useI18n();
  const { setQuantity, remove } = useCart();
  const name = line.item ? loc(line.item, 'name', lang) : t('cart.unavailable');
  return (
    <li className={cx('flex gap-3 py-3', !line.available && 'opacity-70')}>
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-ink-100">
        <FoodImage src={line.item?.image_url} alt="" sizes="64px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink-900">{name}</p>
          {line.available && <Price value={line.unitPrice * line.quantity} className="shrink-0 text-sm font-semibold" />}
        </div>
        {line.options.length > 0 && (
          <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{line.options.map((o) => loc(o, 'name', lang)).join(' · ')}</p>
        )}
        {line.available ? (
          <div className="mt-2 flex items-center justify-between">
            {compact ? (
              <span className="text-xs text-ink-500" dir="ltr">× {line.quantity}</span>
            ) : (
              <QuantityStepper size="sm" min={0} value={line.quantity} onChange={(q) => setQuantity(line.key, q)} />
            )}
            <button
              type="button"
              onClick={() => remove(line.key)}
              className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-danger-50 hover:text-danger-600"
              aria-label={`${t('common.remove')}: ${name}`}
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-danger-600">{t('cart.unavailable')}</span>
            <Button size="sm" variant="dangerGhost" onClick={() => remove(line.key)}>
              {t('common.remove')}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- drawer
function CartDrawer({ open, onClose }) {
  const { t, lang } = useI18n();
  const { lines, restaurant, totals, hasUnavailable, loading, clear } = useCart();
  const canCheckout = lines.length > 0 && !hasUnavailable && !totals.belowMinimum;

  return (
    <Modal
      open={open}
      onClose={onClose}
      side
      title={t('cart.title')}
      footer={
        lines.length > 0 && (
          <div className="space-y-4">
            <TotalsRows totals={totals} restaurant={restaurant} />
            {totals.belowMinimum && (
              <p className="rounded-lg bg-saffron-100 px-3 py-2 text-xs font-medium text-saffron-700">
                {t('cart.belowMin', { amount: `${(restaurant.min_order - totals.subtotal).toLocaleString('en-US')} IQD` })}
              </p>
            )}
            {hasUnavailable && <FormError>{t('error.ITEM_UNAVAILABLE')}</FormError>}
            {canCheckout ? (
              <Link href="/checkout" onClick={onClose} className={buttonClass({ size: 'lg', block: true })}>
                {t('cart.checkout')}
              </Link>
            ) : (
              <Button size="lg" block disabled>
                {t('cart.checkout')}
              </Button>
            )}
          </div>
        )
      }
    >
      {loading ? (
        <div className="space-y-4 py-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-16 w-16" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : lines.length === 0 ? (
        <EmptyState icon={<ShoppingBag size={26} aria-hidden />} title={t('cart.empty')} body={t('cart.emptyBody')}>
          <Link href="/" onClick={onClose} className={buttonClass({ variant: 'soft' })}>
            {t('home.browseAll')}
          </Link>
        </EmptyState>
      ) : (
        <>
          {restaurant && (
            <div className="mb-1 flex items-center justify-between gap-3">
              <Link
                href="/"
                onClick={onClose}
                className="truncate text-sm text-ink-600 hover:text-brand-700"
              >
                {t('cart.from')} <span className="font-semibold text-ink-900">{loc(restaurant, 'name', lang)}</span>
              </Link>
              <button type="button" onClick={clear} className="shrink-0 text-xs font-medium text-ink-500 hover:text-danger-600">
                {t('cart.clear')}
              </button>
            </div>
          )}
          <ul className="divide-y divide-ink-100">
            {lines.map((line) => (
              <CartLine key={line.key} line={line} />
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- item details
function groupRule(t, g) {
  if (g.min_select === 1 && g.max_select === 1) return t('item.chooseOne');
  if (g.min_select === 0) return t('item.chooseUpTo', { n: g.max_select });
  return t('item.chooseBetween', { min: g.min_select, max: g.max_select });
}

function ItemModal({ active, onClose }) {
  const { t, lang } = useI18n();
  const { add } = useCart();
  const errorMessage = useErrorMessage();
  const [groups, setGroups] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const item = active?.item;
  const restaurant = active?.restaurant || item?.restaurant;

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setGroups(null);
    setLoadError('');
    setSelected({});
    setQuantity(1);
    setShowErrors(false);
    getSupabase()
      .from('option_groups')
      .select('id, name_en, name_ar, name_ku, min_select, max_select, options(id, name_en, name_ar, name_ku, price_delta, is_available, sort_order)')
      .eq('item_id', item.id)
      .order('sort_order')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) return setLoadError(errorMessage(error));
        setGroups(data.map((g) => ({ ...g, options: [...g.options].sort((a, b) => a.sort_order - b.sort_order) })));
      });
    return () => {
      cancelled = true;
    };
  }, [item, errorMessage]);

  const toggle = (group, optionId) =>
    setSelected((prev) => {
      const current = prev[group.id] || [];
      if (group.max_select === 1) return { ...prev, [group.id]: current[0] === optionId && group.min_select === 0 ? [] : [optionId] };
      if (current.includes(optionId)) return { ...prev, [group.id]: current.filter((x) => x !== optionId) };
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });

  const chosenIds = Object.values(selected).flat();
  const chosen = (groups || []).flatMap((g) => g.options).filter((o) => chosenIds.includes(o.id));
  const invalidGroups = (groups || []).filter((g) => (selected[g.id]?.length || 0) < g.min_select);
  const open = restaurant ? isRestaurantOpen(restaurant) : true;
  const orderable = Boolean(item?.is_available) && open;

  const submit = async () => {
    if (invalidGroups.length) return setShowErrors(true);
    setAdding(true);
    const done = await add(item, chosenIds, quantity);
    setAdding(false);
    if (done) onClose();
  };

  return (
    <Modal
      open={Boolean(item)}
      onClose={onClose}
      title={item ? loc(item, 'name', lang) : ''}
      footer={
        item && (
          <div className="flex items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} disabled={!orderable} />
            <Button className="flex-1" size="lg" onClick={submit} loading={adding} disabled={!orderable || !groups}>
              {!item.is_available ? (
                t('item.unavailable')
              ) : !open ? (
                t('restaurant.closed')
              ) : (
                <>
                  <span>{t('item.addToCart')}</span>
                  <span aria-hidden>·</span>
                  <Price value={unitPrice(item, chosen) * quantity} />
                </>
              )}
            </Button>
          </div>
        )
      }
    >
      {item && (
        <div className="space-y-5">
          {item.image_url && (
            <div className="relative -mx-5 -mt-4 aspect-[16/10] overflow-hidden bg-ink-100">
              <FoodImage src={item.image_url} alt={loc(item, 'name', lang)} sizes="(max-width: 640px) 100vw, 512px" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-3">
              <Price value={item.price} className="text-lg font-bold text-brand-700" />
              {item.prep_minutes ? (
                <span className="inline-flex items-center gap-1 text-xs text-ink-500">
                  <Clock size={13} aria-hidden /> {t('restaurant.prep', { n: item.prep_minutes })}
                </span>
              ) : null}
            </div>
            {loc(item, 'description', lang) && (
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{loc(item, 'description', lang)}</p>
            )}
          </div>

          {loadError ? (
            <FormError>{loadError}</FormError>
          ) : !groups ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-11 w-full" />
            </div>
          ) : (
            groups.map((group) => {
              const picked = selected[group.id] || [];
              const invalid = showErrors && picked.length < group.min_select;
              const single = group.max_select === 1;
              return (
                <fieldset key={group.id}>
                  <legend className="mb-2 flex w-full items-center justify-between">
                    <span className="text-sm font-bold text-ink-900">{loc(group, 'name', lang)}</span>
                    <span className={cx('rounded-full px-2 py-0.5 text-xs font-medium', invalid ? 'bg-danger-50 text-danger-700' : 'bg-ink-100 text-ink-600')}>
                      {groupRule(t, group)}
                      {group.min_select > 0 && ` · ${t('common.required')}`}
                    </span>
                  </legend>
                  <div className="space-y-1.5">
                    {group.options.map((option) => {
                      const checked = picked.includes(option.id);
                      const full = !single && !checked && picked.length >= group.max_select;
                      const disabled = !option.is_available || full;
                      return (
                        <label
                          key={option.id}
                          className={cx(
                            'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors',
                            checked ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-ink-300',
                            disabled && 'pointer-events-none opacity-50'
                          )}
                        >
                          <input
                            type={single ? 'radio' : 'checkbox'}
                            name={group.id}
                            className="peer sr-only"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(group, option.id)}
                            onClick={() => single && checked && toggle(group, option.id)}
                          />
                          <span
                            aria-hidden
                            className={cx(
                              'flex h-5 w-5 shrink-0 items-center justify-center border-2 text-white transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-brand-200',
                              single ? 'rounded-full' : 'rounded-md',
                              checked ? 'border-brand-600 bg-brand-600' : 'border-ink-300 bg-white'
                            )}
                          >
                            {checked && <Check size={13} strokeWidth={3.5} />}
                          </span>
                          <span className="flex-1 font-medium text-ink-900">{loc(option, 'name', lang)}</span>
                          {!option.is_available ? (
                            <span className="text-xs text-ink-500">{t('item.unavailable')}</span>
                          ) : option.price_delta > 0 ? (
                            <span className="text-ink-600" dir="ltr">+ <Price value={option.price_delta} /></span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })
          )}
        </div>
      )}
    </Modal>
  );
}
