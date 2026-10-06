import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { getI18n } from '@/src/i18n/server';
import { EmptyState } from '@/src/components/ui';
import { buttonClass } from '@/src/lib/styles';

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <div className="container-page py-16">
      <EmptyState icon={<SearchX size={26} aria-hidden />} title="404" body={t('error.notFound')}>
        <Link href="/" className={buttonClass()}>{t('error.notFoundCta')}</Link>
      </EmptyState>
    </div>
  );
}
