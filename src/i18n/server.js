import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { dictionaries, translate } from './dict';
import { DEFAULT_LANG, LANGS } from '@/src/lib/format';

export const getLang = cache(async () => {
  const value = (await cookies()).get('lang')?.value;
  return LANGS.includes(value) ? value : DEFAULT_LANG;
});

// { lang, t } for Server Components.
export async function getI18n() {
  const lang = await getLang();
  return { lang, t: (key, vars) => translate(lang, key, vars) };
}

// Only the active language is sent to the browser.
export function messagesFor(lang) {
  return { ...dictionaries.en, ...dictionaries[lang] };
}
