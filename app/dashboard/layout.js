import { requireStaff } from '@/src/lib/staff';
import { getI18n } from '@/src/i18n/server';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('dash.title'), robots: { index: false } };
}

export default async function DashboardLayout({ children }) {
  await requireStaff();
  return <div className="container-page py-6 sm:py-8">{children}</div>;
}
