import { redirect } from 'next/navigation';

export default async function RestaurantDashboardIndex({ params }) {
  const { rid } = await params;
  redirect(`/dashboard/r/${rid}/menu`);
}
