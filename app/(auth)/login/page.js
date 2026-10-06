import { getI18n } from '@/src/i18n/server';
import { LoginForm } from '@/src/components/auth-forms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('nav.login') };
}

export default async function LoginPage({ searchParams }) {
  const { next, error } = await searchParams;
  return <LoginForm next={typeof next === 'string' ? next : '/dashboard'} linkError={error === 'link'} />;
}
