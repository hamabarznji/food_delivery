import { redirect } from 'next/navigation';
import { requireStaff } from '@/src/lib/staff';
import { DashboardNav } from '@/src/components/dashboard-nav';

export default async function AdminLayout({ children }) {
  const { restaurants, isAdmin } = await requireStaff();
  if (!isAdmin) redirect('/dashboard');
  return (
    <>
      <DashboardNav restaurants={restaurants} current={null} isAdmin />
      {children}
    </>
  );
}
