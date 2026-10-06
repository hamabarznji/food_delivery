import Link from 'next/link';
import { getI18n } from '@/src/i18n/server';

export default async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mt-20 border-t border-ink-200 bg-white">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="text-lg font-extrabold text-ink-900">{t('brand.name')}</p>
          <p className="mt-1 text-sm text-ink-500">{t('brand.tagline')}</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-ink-700" aria-label="Footer">
          <Link href="/" className="hover:text-brand-700">{t('nav.menu')}</Link>
          <Link href="/orders" className="hover:text-brand-700">{t('nav.orders')}</Link>
          <Link href="/dashboard" className="hover:text-brand-700">{t('footer.vendorLogin')}</Link>
        </nav>
      </div>
      <div className="border-t border-ink-100">
        <p className="container-page py-4 text-xs text-ink-500">
          © {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
        </p>
      </div>
    </footer>
  );
}
