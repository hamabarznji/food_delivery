import { redirect } from 'next/navigation';
import { Store } from 'lucide-react';
import { requireStaff } from '@/src/lib/staff';
import { getI18n } from '@/src/i18n/server';
import { EmptyState } from '@/src/components/ui';

export default async function DashboardIndex() {
  const { restaurants, isAdmin } = await requireStaff();
  if (restaurants.length > 0) redirect(`/dashboard/r/${restaurants[0].id}/menu`);
  if (isAdmin) redirect('/dashboard/admin');
  const { t } = await getI18n();
  return <EmptyState icon={<Store size={26} aria-hidden />} title={t('dash.title')} body={t('dash.noRestaurant')} />;
}
