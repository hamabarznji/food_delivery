'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ExternalLink, Users, UtensilsCrossed } from 'lucide-react';
import { loc } from '@/src/lib/format';
import { useI18n } from './providers';
import { Dropdown, DropdownItem } from './dropdown';
import { Badge, FoodImage, buttonClass, cx } from './ui';

export function DashboardNav({ restaurants, current, isAdmin }) {
  const { t, lang } = useI18n();
  const pathname = usePathname();
  const base = current ? `/dashboard/r/${current.id}` : null;
  const menuBase = base || (restaurants[0] ? `/dashboard/r/${restaurants[0].id}` : null);
  const tabs = [];
  if (menuBase) tabs.push([`${menuBase}/menu`, t('dash.menu'), UtensilsCrossed]);
  if (isAdmin) tabs.push(['/dashboard/admin', t('admin.users'), Users]);

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {current ? (
          <>
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-ink-100">
              <FoodImage src={current.logo_url} alt="" sizes="44px" />
            </span>
            {restaurants.length > 1 ? (
              <Dropdown
                align="start"
                label={t('admin.restaurants')}
                triggerClassName="flex items-center gap-1.5 rounded-lg text-xl font-extrabold tracking-tight text-ink-900 hover:text-brand-700"
                trigger={<>{loc(current, 'name', lang)} <ChevronDown size={18} aria-hidden /></>}
              >
                <div className="max-h-72 overflow-y-auto">
                  {restaurants.map((r) => (
                    <DropdownItem key={r.id} href={`/dashboard/r/${r.id}`}>{loc(r, 'name', lang)}</DropdownItem>
                  ))}
                </div>
              </Dropdown>
            ) : (
              <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{loc(current, 'name', lang)}</h1>
            )}
            {!current.is_active && <Badge tone="warning">{t('menu.hidden')}</Badge>}
            <Link href="/" className={cx(buttonClass({ variant: 'ghost', size: 'sm' }), 'ms-auto')}>
              {t('dash.viewStore')} <ExternalLink size={15} aria-hidden />
            </Link>
          </>
        ) : (
          <h1 className="text-xl font-extrabold tracking-tight text-ink-900">{t('admin.users')}</h1>
        )}
      </div>

      <nav className="no-scrollbar -mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-ink-200 px-4 sm:mx-0 sm:px-0" aria-label={t('dash.title')}>
        {tabs.map(([href, label, Icon]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors',
                active ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-600 hover:text-ink-900'
              )}
            >
              <Icon size={16} aria-hidden /> {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// EN / KU / AR switch used by the content editors.
export function LangTabs({ value, onChange, filled = {} }) {
  const { t } = useI18n();
  return (
    <div className="inline-flex rounded-full bg-ink-100 p-1" role="tablist">
      {[['ku', t('menu.kurdish')], ['ar', t('menu.arabic')], ['en', t('menu.english')]].map(([code, label]) => (
        <button
          key={code}
          type="button"
          role="tab"
          aria-selected={value === code}
          onClick={() => onChange(code)}
          className={cx(
            'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors',
            value === code ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
          )}
        >
          {label}
          {filled[code] && <span className="h-1.5 w-1.5 rounded-full bg-herb-600" aria-hidden />}
        </button>
      ))}
    </div>
  );
}

// name_en is the required fallback column: fill it from another language if empty.
export function withFallbackName(values, field = 'name') {
  const en = values[`${field}_en`]?.trim();
  const ku = values[`${field}_ku`]?.trim();
  const ar = values[`${field}_ar`]?.trim();
  return { ...values, [`${field}_en`]: en || ku || ar || '', [`${field}_ku`]: ku || null, [`${field}_ar`]: ar || null };
}
