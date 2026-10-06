import Link from 'next/link';
import { getSession } from '@/src/lib/supabase/server';
import { getI18n } from '@/src/i18n/server';
import { buttonClass } from '@/src/lib/styles';
import { FormError } from '@/src/components/ui';
import { NewPasswordForm } from '@/src/components/auth-forms';

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t('auth.resetTitle') };
}

// Reached through the e-mailed recovery link, which signs the user in first.
export default async function ResetPasswordPage() {
  const { t } = await getI18n();
  const { user } = await getSession();
  if (!user) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{t('auth.resetTitle')}</h1>
        <FormError>{t('auth.linkInvalid')}</FormError>
        <Link href="/forgot-password" className={buttonClass({ block: true })}>{t('auth.sendReset')}</Link>
      </div>
    );
  }
  return <NewPasswordForm redirectTo="/" />;
}
