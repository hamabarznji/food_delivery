import { getI18n } from '@/src/i18n/server';
import OrdersList from './orders-list';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('orders.title') };
}

export default function OrdersPage() {
  return <OrdersList />;
}
