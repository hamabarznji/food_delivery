import { getI18n } from '@/src/i18n/server';
import AccountView from './view';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('account.title') };
}

// Staff profile and password. Customers order without an account.
export default function AccountPage() {
  return <AccountView />;
}
