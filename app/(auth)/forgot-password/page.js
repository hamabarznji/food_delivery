import { getI18n } from '@/src/i18n/server';
import { ForgotPasswordForm } from '@/src/components/auth-forms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('auth.forgotTitle') };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
