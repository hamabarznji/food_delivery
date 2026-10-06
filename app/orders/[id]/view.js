'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, MapPin, Phone, SearchX, User } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { orderToken, rememberOrder } from '@/src/lib/device';
import { formatDateTime, formatPhone, loc } from '@/src/lib/format';
import { useI18n } from '@/src/components/providers';
import { ReorderButton } from '@/src/components/orders';
import { EmptyState, Price, Skeleton, buttonClass } from '@/src/components/ui';

// Order confirmation / receipt. The restaurant receives the order on Telegram;
// there is no status tracking for now.
export default function OrderView({ orderId, urlToken, justPlaced }) {
  const { t, lang } = useI18n();
  const [order, setOrder] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let cancelled = false;
    // the token comes from the link, or from this browser's saved orders
    if (urlToken) rememberOrder(orderId, urlToken);
    const token = urlToken || orderToken(orderId);
    if (!token) {
      setOrder(null);
      return;
    }
    getSupabase()
      .rpc('track_order', { p_order: orderId, p_token: token })
      .then(({ data }) => !cancelled && setOrder(data || null));
    return () => {
      cancelled = true;
    };
  }, [orderId, urlToken]);

  if (order === undefined) {
    return (
      <div className="container-page max-w-2xl py-8" aria-busy="true">
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (order === null) {
    return (
      <div className="container-page py-12">
        <EmptyState icon={<SearchX size={26} aria-hidden />} title={t('orders.notFound')} body={t('orders.notFoundBody')}>
          <Link href="/orders" className={buttonClass()}>{t('orders.title')}</Link>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-brand-700">
        <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden /> {t('orders.title')}
      </Link>

      {justPlaced && (
        <div className="mt-4 flex animate-rise items-start gap-3 rounded-2xl border border-herb-600/20 bg-herb-50 p-4" role="status">
          <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-herb-600" aria-hidden />
          <div>
            <p className="font-bold text-herb-700">{t('orders.confirmationTitle')}</p>
            <p className="text-sm text-herb-700/90">{t('orders.confirmationBody')}</p>
          </div>
        </div>
      )}

      <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl" dir="ltr">
        {t('orders.order', { n: order.order_number })}
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        {loc(order.restaurant, 'name', lang)} · {t('orders.placedOn', { date: formatDateTime(order.created_at, lang) })}
      </p>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">{t('orders.items')}</h2>
        <ul className="mt-2 divide-y divide-ink-100">
          {order.order_items.map((item) => (
            <li key={item.id} className="flex gap-3 py-3 text-sm">
              <span className="font-semibold tabular-nums text-brand-700" dir="ltr">{item.quantity}×</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink-900">{loc(item, 'name', lang)}</p>
                {item.options.length > 0 && <p className="text-xs text-ink-500">{item.options.map((o) => loc(o, 'name', lang)).join(' · ')}</p>}
              </div>
              <Price value={item.line_total} className="shrink-0 font-medium" />
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-2 border-t border-ink-100 pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-ink-600">{t('cart.subtotal')}</dt><dd><Price value={order.subtotal} /></dd></div>
          <div className="flex justify-between"><dt className="text-ink-600">{t('cart.delivery')}</dt><dd>{order.delivery_fee === 0 ? t('common.free') : <Price value={order.delivery_fee} />}</dd></div>
          {order.discount > 0 && (
            <div className="flex justify-between text-herb-700"><dt>{t('cart.discount')}</dt><dd dir="ltr">− <Price value={order.discount} /></dd></div>
          )}
          <div className="flex justify-between border-t border-dashed border-ink-200 pt-3 text-base font-bold">
            <dt>{t('cart.total')}</dt><dd className="text-brand-700"><Price value={order.total} /></dd>
          </div>
          <p className="pt-1 text-xs text-ink-500">{t('checkout.cash')}</p>
        </dl>
      </section>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="font-bold text-ink-900">{t('orders.deliveryInfo')}</h2>
        <dl className="mt-3 space-y-2.5 text-sm text-ink-700">
          <div className="flex items-center gap-2.5"><User size={16} className="text-ink-400" aria-hidden /><dd>{order.customer_name}</dd></div>
          <div className="flex items-center gap-2.5"><Phone size={16} className="text-ink-400" aria-hidden /><dd dir="ltr">{formatPhone(order.customer_phone)}</dd></div>
          <div className="flex items-start gap-2.5"><MapPin size={16} className="mt-0.5 text-ink-400" aria-hidden /><dd>{[order.location_label, order.address_details].filter(Boolean).join(' · ')}</dd></div>
          {order.comment && <p className="rounded-xl bg-ink-50 px-3.5 py-2.5 text-ink-600">“{order.comment}”</p>}
        </dl>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/" className={buttonClass({ variant: 'secondary' })}>{t('home.browseAll')}</Link>
        <ReorderButton order={order} variant="primary" size="md" />
      </div>
    </div>
  );
}
