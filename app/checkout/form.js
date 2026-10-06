'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Check, ShoppingBag } from 'lucide-react';
import { placeOrder } from './actions';
import { cartTotals, formatPhone, isRestaurantOpen, isValidPhone, loc } from '@/src/lib/format';
import { rememberCustomer, rememberOrder, savedCustomer } from '@/src/lib/device';
import { useErrorMessage, useI18n, useToast } from '@/src/components/providers';
import { CartLine, TotalsRows, useCart } from '@/src/components/cart';
import { Button, EmptyState, FormError, SelectField, Skeleton, TextArea, TextField, buttonClass } from '@/src/components/ui';

// The last step of ordering: the customer enters who they are and where to
// deliver. No account is involved.
export default function CheckoutForm({ locations }) {
  const { t, lang } = useI18n();
  const { lines, restaurant, hasUnavailable, loading, reload, clear } = useCart();
  const toast = useToast();
  const errorMessage = useErrorMessage();
  const router = useRouter();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [locationId, setLocationId] = useState('');
  const [details, setDetails] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  // one key per checkout attempt: a retry after a network blip cannot double-order
  const idempotencyKey = useRef(null);

  // prefill from the details last used on this device
  useEffect(() => {
    const saved = savedCustomer();
    if (saved.name) setName(String(saved.name).slice(0, 80));
    if (saved.phone) setPhone(formatPhone(saved.phone));
    if (saved.locationId && locations.some((l) => String(l.id) === String(saved.locationId))) setLocationId(String(saved.locationId));
    if (saved.details) setDetails(String(saved.details).slice(0, 200));
  }, [locations]);

  const available = lines.filter((l) => l.available);
  const items = available.map((l) => ({ itemId: l.itemId, optionIds: l.optionIds, quantity: l.quantity }));
  const totals = cartTotals(available, restaurant);
  const open = restaurant ? isRestaurantOpen(restaurant) : true;

  // an error disappears as soon as the customer starts fixing that field
  const clearError = (field) => setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const next = {};
    if (name.trim().length < 2) next.name = t('error.NAME_INVALID');
    if (!isValidPhone(phone)) next.phone = t('error.PHONE_INVALID');
    if (!locationId) next.location = t('error.LOCATION_INVALID');
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }

    setSubmitting(true);
    idempotencyKey.current ||= crypto.randomUUID();
    let result;
    try {
      result = await placeOrder({
        idempotencyKey: idempotencyKey.current,
        items,
        name,
        phone,
        locationId: Number(locationId),
        details,
        comment,
      });
    } catch {
      result = { ok: false, code: 'NETWORK' };
    }

    if (!result.ok) {
      setSubmitting(false);
      if (result.code === 'NETWORK') return setFormError(t('error.network')); // same key is reused on retry
      idempotencyKey.current = null;
      if (result.code === 'ITEM_UNAVAILABLE' || result.code === 'OPTIONS_INVALID' || result.code === 'CART_EMPTY') reload();
      return setFormError(result.code === 'GENERIC' ? t('error.generic') : errorMessage(result.code));
    }

    setPlaced(true);
    rememberOrder(result.orderId, result.token);
    rememberCustomer({ name: name.trim(), phone, locationId, details: details.trim() });
    clear();
    toast.success(t('checkout.success'));
    router.replace(`/orders/${result.orderId}?t=${result.token}&placed=1`);
  };

  if (loading || placed) {
    return (
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]" aria-busy="true">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page py-12">
        <EmptyState icon={<ShoppingBag size={26} aria-hidden />} title={t('cart.empty')} body={t('cart.emptyBody')}>
          <Link href="/" className={buttonClass()}>{t('home.browseAll')}</Link>
        </EmptyState>
      </div>
    );
  }

  const blocked = hasUnavailable || totals.belowMinimum || !open;
  const sectionTitle = 'mb-4 text-base font-bold text-ink-900';

  return (
    <form onSubmit={submit} noValidate className="container-page py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t('checkout.title')}</h1>
      {restaurant && (
        <p className="mt-1 text-sm text-ink-600">
          {t('cart.from')}{' '}
          <Link href="/" className="font-semibold text-brand-700 hover:underline">
            {loc(restaurant, 'name', lang)}
          </Link>
        </p>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6">
            <h2 className={sectionTitle}>{t('checkout.contact')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t('checkout.fullName')}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError('name');
                }}
                error={errors.name}
                autoComplete="name"
                maxLength={80}
                required
              />
              <TextField
                label={t('checkout.phone')}
                type="tel"
                inputMode="numeric"
                dir="ltr"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhone(e.target.value));
                  clearError('phone');
                }}
                error={errors.phone}
                placeholder="0XXX XXX XX XX"
                autoComplete="tel"
                maxLength={14}
                required
              />
            </div>
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className={sectionTitle}>{t('checkout.deliverTo')}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                label={t('checkout.building')}
                value={locationId}
                onChange={(e) => {
                  setLocationId(e.target.value);
                  clearError('location');
                }}
                error={errors.location}
                required
              >
                <option value="" disabled>{t('checkout.chooseBuilding')}</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{loc(l, 'name', lang)}</option>
                ))}
              </SelectField>
              <TextField
                label={t('checkout.details')}
                optional
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={200}
              />
            </div>
            <TextArea className="mt-4" label={t('checkout.comment')} optional value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} rows={2} />
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className={sectionTitle}>{t('checkout.payment')}</h2>
            <div className="flex items-center gap-3 rounded-xl border border-brand-500 bg-brand-50 px-4 py-3 text-sm font-semibold text-ink-900">
              <Banknote size={20} className="text-brand-600" aria-hidden />
              <span className="flex-1">{t('checkout.cash')}</span>
              <Check size={18} className="text-brand-600" aria-hidden />
            </div>
          </section>
        </div>

        <aside className="card p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className={sectionTitle}>{t('checkout.summary')}</h2>
          <ul className="-mt-2 divide-y divide-ink-100">
            {lines.map((line) => (
              <CartLine key={line.key} line={line} />
            ))}
          </ul>

          <div className="mt-5">
            <TotalsRows totals={totals} restaurant={restaurant} />
          </div>

          <div className="mt-5 space-y-3">
            {!open && <FormError>{t('error.RESTAURANT_CLOSED')}</FormError>}
            {hasUnavailable && <FormError>{t('error.ITEM_UNAVAILABLE')}</FormError>}
            {totals.belowMinimum && (
              <FormError>{t('cart.belowMin', { amount: `${(restaurant.min_order - totals.subtotal).toLocaleString('en-US')} IQD` })}</FormError>
            )}
            <FormError>{formError}</FormError>
            <Button type="submit" size="lg" block loading={submitting} disabled={blocked}>
              {submitting ? t('checkout.placing') : t('checkout.place')}
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
