'use client';

import { useEffect } from 'react';
import { CloudOff } from 'lucide-react';
import { useI18n } from '@/src/components/providers';
import { Button, EmptyState } from '@/src/components/ui';

export default function Error({ error, reset }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page py-16">
      <EmptyState icon={<CloudOff size={26} aria-hidden />} title={t('error.generic')} body={t('error.network')}>
        <Button onClick={reset}>{t('common.retry')}</Button>
      </EmptyState>
    </div>
  );
}
