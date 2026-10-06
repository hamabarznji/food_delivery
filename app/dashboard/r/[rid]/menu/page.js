import MenuManager from './manager';

export default async function DashboardMenuPage({ params }) {
  const { rid } = await params;
  return <MenuManager restaurantId={rid} />;
}
