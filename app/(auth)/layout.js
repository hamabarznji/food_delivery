import { Bike, ShieldCheck, UtensilsCrossed } from 'lucide-react';
import { getI18n } from '@/src/i18n/server';

export default async function AuthLayout({ children }) {
  const { t } = await getI18n();
  return (
    <div className="container-page py-8 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-lift lg:grid-cols-2">
        <div className="p-6 sm:p-10">{children}</div>
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white lg:flex lg:flex-col lg:justify-end">
          <div aria-hidden className="absolute -end-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -start-10 top-32 h-40 w-40 rounded-full bg-saffron-400/20" />
          <UtensilsCrossed size={40} className="relative" aria-hidden />
          <p className="relative mt-6 text-3xl font-extrabold leading-tight">{t('home.heroTitle')}</p>
          <p className="relative mt-3 text-white/85">{t('brand.tagline')}</p>
          <ul className="relative mt-8 space-y-3 text-sm font-medium text-white/90">
            <li className="flex items-center gap-2.5"><Bike size={18} aria-hidden /> {t('home.step3')}</li>
            <li className="flex items-center gap-2.5"><ShieldCheck size={18} aria-hidden /> {t('checkout.cash')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
