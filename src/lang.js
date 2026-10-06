'use client';

import { Check, Languages } from 'lucide-react';
import { useI18n } from '@/src/components/providers';
import { Dropdown, DropdownItem } from '@/src/components/dropdown';

const LANGUAGES = [
  { code: 'ku', label: 'کوردی', short: 'کوردی' },
  { code: 'ar', label: 'العربية', short: 'عربي' },
  { code: 'en', label: 'English', short: 'EN' },
];

const LanguageDropdown = () => {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  return (
    <Dropdown
      label={t('nav.language')}
      trigger={
        <>
          <Languages size={18} aria-hidden />
          <span className="hidden text-sm font-medium sm:inline">{current.short}</span>
        </>
      }
      triggerClassName="flex h-10 items-center gap-1.5 rounded-full px-2.5 text-ink-700 transition-colors hover:bg-ink-100"
    >
      {LANGUAGES.map((l) => (
        <DropdownItem key={l.code} onSelect={() => setLang(l.code)} lang={l.code}>
          <span className="flex-1">{l.label}</span>
          {l.code === lang && <Check size={16} className="text-brand-600" aria-hidden />}
        </DropdownItem>
      ))}
    </Dropdown>
  );
};

export default LanguageDropdown;
