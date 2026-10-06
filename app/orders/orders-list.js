'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, ReceiptText } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { savedOrders } from '@/src/lib/device';
import { formatDateTime, loc } from '@/src/lib/format';
import { useI18n } from '@/src/components/providers';
import { ReorderButton } from '@/src/components/orders';
import { EmptyState, Price, Skeleton, buttonClass } from '@/src/components/ui';

// Orders placed from this browser. There are no customer accounts: each order
// is fetched with the private token that was saved when it was placed.
export default function OrdersList() {
  const { t, lang } = useI18n();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    Promise.all(
      savedOrders()
        .slice(0, 20)
        .map(({ id, token }) =>
          supabase.rpc('track_order', { p_order: id, p_token: token }).then(({ data }) => (data ? { ...data, token } : null))
        )
    ).then((results) => !cancelled && setOrders(results.filter(Boolean)));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{t('orders.title')}</h1>
      <p className="mt-1 text-sm text-ink-500">{t('orders.deviceNote')}</p>

      {orders === null ? (
        <div className="mt-6 space-y-3" aria-busy="true">
          {[0, 1].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<ReceiptText size={26} aria-hidden />} title={t('orders.empty')} body={t('orders.emptyBody')}>
          <Link href="/" className={buttonClass()}>{t('home.browseAll')}</Link>
        </EmptyState>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="card p-4 transition-shadow hover:shadow-lift sm:p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold text-ink-900" dir="ltr">{t('orders.order', { n: order.order_number })}</p>
                <p className="text-xs text-ink-500">{formatDateTime(order.created_at, lang)}</p>
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-ink-600">
                {order.order_items.map((i) => `${i.quantity}× ${loc(i, 'name', lang)}`).join(' · ')}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
                <Price value={order.total} className="font-bold text-ink-900" />
                <div className="flex gap-2">
                  <ReorderButton order={order} />
                  <Link href={`/orders/${order.id}?t=${order.token}`} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
                    {t('orders.details')}
                    <ChevronRight size={16} className="rtl:rotate-180" aria-hidden />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
