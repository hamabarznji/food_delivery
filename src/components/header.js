'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, LayoutDashboard, LogOut, Menu as MenuIcon, ReceiptText, ShoppingBag, User, UtensilsCrossed, X } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import LanguageDropdown from '@/src/lang';
import { useAuth, useI18n } from './providers';
import { useCart } from './cart';
import { Dropdown, DropdownItem } from './dropdown';
import { Avatar, cx } from './ui';

export function Logo({ className }) {
  const { t } = useI18n();
  return (
    <Link href="/" className={cx('flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight text-ink-900', className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <ChefHat size={20} aria-hidden />
      </span>
      <span>{t('brand.name')}</span>
    </Link>
  );
}

export default function Header() {
  const { t } = useI18n();
  const { user, profile } = useAuth();
  const { totals, openCart } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isStaff = profile?.role === 'vendor' || profile?.role === 'admin';

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const logout = async () => {
    await getSupabase().auth.signOut();
    window.location.assign('/');
  };

  const navLink = (href, label) => {
    const active = href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={cx(
          'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
          active ? 'bg-ink-900 text-white' : 'text-ink-700 hover:bg-ink-100'
        )}
      >
        {label}
      </Link>
    );
  };

  return (
    <header
      id="site-header"
      className={cx(
        'sticky top-0 z-40 border-b bg-cream/90 backdrop-blur-md transition-shadow',
        scrolled ? 'border-ink-200 shadow-card' : 'border-transparent'
      )}
    >
      <div className="container-page flex h-16 items-center gap-3">
        <Logo />
        <nav className="ms-3 hidden items-center gap-1 md:flex" aria-label={t('nav.menu')}>
          {navLink('/', t('nav.menu'))}
          {navLink('/orders', t('nav.orders'))}
          {isStaff && navLink('/dashboard', t('nav.dashboard'))}
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <LanguageDropdown />

          <button
            type="button"
            onClick={openCart}
            className="relative flex h-10 items-center gap-2 rounded-full bg-ink-900 px-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink-700"
            aria-label={`${t('nav.cart')} (${totals.count})`}
          >
            <ShoppingBag size={18} aria-hidden />
            <span className="hidden sm:inline">{t('nav.cart')}</span>
            {totals.count > 0 && (
              <span
                key={totals.count}
                className="flex h-5 min-w-5 animate-bump items-center justify-center rounded-full bg-brand-500 px-1.5 text-xs font-bold tabular-nums"
              >
                {totals.count}
              </span>
            )}
          </button>

          {user ? (
            <Dropdown
              label={t('nav.account')}
              trigger={<Avatar src={profile?.avatar_url} name={profile?.full_name || user.email} />}
              triggerClassName="ms-1 hidden rounded-full ring-2 ring-transparent transition-shadow hover:ring-brand-200 md:block"
            >
              <div className="border-b border-ink-100 px-3 pb-2.5 pt-1.5">
                <p className="truncate text-sm font-semibold text-ink-900">{profile?.full_name || t('nav.account')}</p>
                <p className="truncate text-xs text-ink-500" dir="ltr">{user.email}</p>
              </div>
              <DropdownItem href="/account"><User size={16} aria-hidden />{t('nav.account')}</DropdownItem>
              {isStaff && <DropdownItem href="/dashboard"><LayoutDashboard size={16} aria-hidden />{t('nav.dashboard')}</DropdownItem>}
              <DropdownItem onSelect={logout} danger><LogOut size={16} aria-hidden />{t('nav.logout')}</DropdownItem>
            </Dropdown>
          ) : null}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-800 hover:bg-ink-100 md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={t('nav.menu')}
          >
            {mobileOpen ? <X size={22} aria-hidden /> : <MenuIcon size={22} aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav id="mobile-nav" className="animate-fade-in border-t border-ink-200 bg-cream md:hidden" aria-label={t('nav.menu')}>
          <div className="container-page space-y-1 py-4">
            <MobileLink href="/" icon={UtensilsCrossed} label={t('nav.menu')} />
            <MobileLink href="/orders" icon={ReceiptText} label={t('nav.orders')} />
            {user && (
              <>
                <MobileLink href="/account" icon={User} label={t('nav.account')} />
                {isStaff && <MobileLink href="/dashboard" icon={LayoutDashboard} label={t('nav.dashboard')} />}
                <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-danger-600 hover:bg-danger-50">
                  <LogOut size={18} aria-hidden /> {t('nav.logout')}
                </button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

function MobileLink({ href, icon: Icon, label }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-800 hover:bg-ink-100">
      <Icon size={18} className="text-ink-500" aria-hidden /> {label}
    </Link>
  );
}
