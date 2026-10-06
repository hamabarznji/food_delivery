import { notFound } from 'next/navigation';
import { requireStaff } from '@/src/lib/staff';
import { DashboardNav } from '@/src/components/dashboard-nav';

export default async function RestaurantDashboardLayout({ children, params }) {
  const { rid } = await params;
  const { restaurants, isAdmin } = await requireStaff();
  const current = restaurants.find((r) => r.id === rid);
  if (!current) notFound(); // not yours (or does not exist)
  return (
    <>
      <DashboardNav restaurants={restaurants} current={current} isAdmin={isAdmin} />
      {children}
    </>
  );
}
