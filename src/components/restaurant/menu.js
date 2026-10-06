'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { isRestaurantOpen, loc } from '@/src/lib/format';
import { useI18n } from '@/src/components/providers';
import { CartLine, TotalsRows, useCart } from '@/src/components/cart';
import { FoodCard } from '@/src/components/cards';
import { EmptyState, FormError, Price, buttonClass, cx } from '@/src/components/ui';

const OTHER = 'other';

export default function RestaurantMenu({ restaurant, categories, items }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const navRef = useRef(null);
  const open = isRestaurantOpen(restaurant);

  // group items under their category; anything uncategorised goes last
  const sections = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const visible = needle
      ? items.filter((i) =>
          [i.name_en, i.name_ar, i.name_ku, i.description_en, i.description_ar, i.description_ku].some((v) =>
            v?.toLowerCase().includes(needle)
          )
        )
      : items;
    const known = new Set(categories.map((c) => c.id));
    const grouped = categories.map((c) => ({ ...c, items: visible.filter((i) => i.category_id === c.id) }));
    const rest = visible.filter((i) => !known.has(i.category_id));
    if (rest.length) grouped.push({ id: OTHER, name_en: t('restaurant.other'), items: rest });
    return grouped.filter((s) => s.items.length);
  }, [categories, items, query, t]);

  useEffect(() => {
    if (sections.length && !sections.some((s) => s.id === activeSection)) setActiveSection(sections[0].id);
  }, [sections, activeSection]);

  // ----- Smooth scroll with sticky header offset
  const scrollToSection = (id) => {
    const node = document.getElementById(`sec-${id}`);
    if (!node) return;
    const offset = (document.getElementById('site-header')?.offsetHeight || 0) + (navRef.current?.offsetHeight || 0) + 12;
    window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - offset, behavior: 'smooth' });
    setActiveSection(id);
  };

  // ----- ScrollSpy (highlights the active tab while scrolling)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const key = visible?.target.getAttribute('data-key');
        if (key) setActiveSection(key);
      },
      { rootMargin: '-140px 0px -65% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    sections.forEach((s) => {
      const el = document.getElementById(`sec-${s.id}`);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  // keep the active tab in view inside the horizontal nav
  useEffect(() => {
    const nav = navRef.current?.querySelector('nav');
    const tab = nav?.querySelector('[aria-current="true"]');
    if (nav && tab) nav.scrollTo({ left: tab.offsetLeft - nav.clientWidth / 2 + tab.clientWidth / 2, behavior: 'smooth' });
  }, [activeSection]);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0">
        {!open && <FormError>{t('restaurant.closedNotice')}</FormError>}

        {items.length === 0 ? (
          <EmptyState title={t('restaurant.emptyMenu')} />
        ) : (
          <>
            <div ref={navRef} className="sticky top-16 z-30 -mx-4 mt-2 border-b border-ink-200 bg-cream/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
              <div className="flex items-center gap-3">
                <label className="relative hidden shrink-0 sm:block">
                  <span className="sr-only">{t('restaurant.searchMenu')}</span>
                  <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('restaurant.searchMenu')}
                    className="h-10 w-52 rounded-full border border-ink-200 bg-white pe-3 ps-9 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </label>
                <nav className="no-scrollbar relative flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label={t('nav.menu')}>
                  {sections.map((s) => {
                    const active = activeSection === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollToSection(s.id)}
                        aria-current={active ? 'true' : undefined}
                        className={cx(
                          'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                          active ? 'bg-brand-600 text-white' : 'bg-white text-ink-700 hover:bg-brand-50 hover:text-brand-800'
                        )}
                      >
                        {loc(s, 'name', lang)}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {sections.length === 0 ? (
              <EmptyState title={t('browse.noResults')} body={t('browse.noResultsBody')} />
            ) : (
              sections.map((s) => (
                <section key={s.id} id={`sec-${s.id}`} data-key={s.id} className="pt-8" aria-labelledby={`sec-title-${s.id}`}>
                  <h2 id={`sec-title-${s.id}`} className="text-xl font-extrabold tracking-tight text-ink-900">
                    {loc(s, 'name', lang)}
                  </h2>
                  {loc(s, 'note', lang) && <p className="mt-1 text-sm text-ink-500">{loc(s, 'note', lang)}</p>}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {s.items.map((item) => (
                      <FoodCard key={item.id} item={item} restaurant={restaurant} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>

      <CartPanel />
      <MobileCartBar />
    </div>
  );
}

// Desktop: the cart stays visible beside the menu.
function CartPanel() {
  const { t } = useI18n();
  const { lines, restaurant, totals, hasUnavailable } = useCart();
  const canCheckout = lines.length > 0 && !hasUnavailable && !totals.belowMinimum;
  return (
    <aside className="hidden lg:block" aria-label={t('cart.title')}>
      <div className="card sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col p-5">
        <h2 className="text-lg font-bold text-ink-900">{t('cart.title')}</h2>
        {lines.length === 0 ? (
          <div className="py-10 text-center">
            <ShoppingBag size={28} className="mx-auto text-ink-300" aria-hidden />
            <p className="mt-3 text-sm font-medium text-ink-700">{t('cart.empty')}</p>
            <p className="mt-0.5 text-xs text-ink-500">{t('cart.emptyBody')}</p>
          </div>
        ) : (
          <>
            <ul className="-me-2 mt-2 min-h-0 flex-1 divide-y divide-ink-100 overflow-y-auto pe-2">
              {lines.map((line) => (
                <CartLine key={line.key} line={line} />
              ))}
            </ul>
            <div className="mt-3 space-y-3 border-t border-ink-100 pt-4">
              <TotalsRows totals={totals} restaurant={restaurant} />
              {totals.belowMinimum && (
                <p className="rounded-lg bg-saffron-100 px-3 py-2 text-xs font-medium text-saffron-700">
                  {t('cart.belowMin', { amount: `${(restaurant.min_order - totals.subtotal).toLocaleString('en-US')} IQD` })}
                </p>
              )}
              {canCheckout ? (
                <Link href="/checkout" className={buttonClass({ size: 'lg', block: true })}>
                  {t('cart.checkout')}
                </Link>
              ) : (
                <span className={cx(buttonClass({ size: 'lg', block: true }), 'pointer-events-none opacity-50')} aria-disabled="true">
                  {t('cart.checkout')}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

// Mobile / tablet: a floating bar opens the cart drawer.
function MobileCartBar() {
  const { t } = useI18n();
  const { totals, openCart } = useCart();
  if (!totals.count) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 animate-rise border-t border-ink-200 bg-white/95 p-3 backdrop-blur lg:hidden">
      <button type="button" onClick={openCart} className={cx(buttonClass({ size: 'lg', block: true }), 'justify-between')}>
        <span className="flex items-center gap-2">
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs tabular-nums">{totals.count}</span>
          {t('cart.title')}
        </span>
        <Price value={totals.subtotal} />
      </button>
    </div>
  );
}
