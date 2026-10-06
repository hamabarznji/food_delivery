import { notFound } from 'next/navigation';
import { getI18n } from '@/src/i18n/server';
import OrderView from './view';

const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata() {
  const { t } = await getI18n();
  // the URL carries the tracking token: keep it out of search engines and referrers
  return { title: t('orders.track'), robots: { index: false }, referrer: 'no-referrer' };
}

export default async function OrderPage({ params, searchParams }) {
  const { id } = await params;
  const { t: token, placed } = await searchParams;
  if (!UUID.test(id)) notFound();
  return <OrderView orderId={id} urlToken={typeof token === 'string' && UUID.test(token) ? token : null} justPlaced={placed === '1'} />;
}
