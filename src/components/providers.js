'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';
import { isRTL } from '@/src/lib/format';

// ---------------------------------------------------------------- i18n
const I18nContext = createContext(null);

export function I18nProvider({ lang, messages, children }) {
  const router = useRouter();
  const t = useCallback(
    (key, vars) => {
      let s = messages[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [messages]
  );
  const setLang = useCallback(
    (next) => {
      document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    },
    [router]
  );
  const value = useMemo(() => ({ lang, t, setLang, rtl: isRTL(lang) }), [lang, t, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export const useI18n = () => useContext(I18nContext);

// Map a Supabase / Postgres error to a translated, user-safe message.
export function useErrorMessage() {
  const { t } = useI18n();
  return useCallback(
    (error) => {
      const msg = typeof error === 'string' ? error : error?.message || '';
      const key = `error.${msg}`;
      if (/^[A-Z_]+$/.test(msg) && t(key) !== key) return t(key);
      if (error?.code === '23505') return t('error.duplicate');
      if (error?.code === '42501' || /row-level security|permission denied/i.test(msg)) return t('error.forbidden');
      if (/JWT|session|refresh token/i.test(msg)) return t('error.sessionExpired');
      if (/fetch|network/i.test(msg)) return t('error.network');
      return t('error.generic');
    },
    [t]
  );
}

// ---------------------------------------------------------------- toasts
const ToastContext = createContext(null);
const TOAST_ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TOAST_TONES = { success: 'text-herb-600', error: 'text-danger-600', info: 'text-brand-600' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const push = useCallback(
    (type, message) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, type, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
    },
    [dismiss]
  );
  const api = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.type];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto flex w-full max-w-sm animate-rise items-start gap-3 rounded-xl bg-ink-900 px-4 py-3 text-sm text-white shadow-pop"
            >
              <Icon size={18} className={`mt-0.5 shrink-0 rounded-full bg-white ${TOAST_TONES[toast.type]}`} aria-hidden />
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button onClick={() => dismiss(toast.id)} className="shrink-0 rounded p-0.5 text-ink-300 hover:text-white" aria-label="×">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------- auth
const AuthContext = createContext({ user: null, profile: null });

export function AuthProvider({ initialUser, initialProfile, children }) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [profile, setProfile] = useState(initialProfile);

  // the server is the source of truth after each navigation / refresh
  useEffect(() => {
    setUser(initialUser);
    setProfile(initialProfile);
  }, [initialUser, initialProfile]);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabase();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, email, full_name, phone, avatar_url, role')
      .eq('id', auth.user.id)
      .maybeSingle();
    if (data) setProfile(data);
  }, []);

  // Keep every tab honest: a sign-in / sign-out elsewhere, or an expired
  // session, re-runs the server (middleware + layouts) for the current page.
  const userIdRef = useRef(initialUser?.id || null);
  useEffect(() => {
    userIdRef.current = initialUser?.id || null;
  }, [initialUser]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_OUT' && event !== 'SIGNED_IN') return;
      const nextId = session?.user?.id || null;
      if (nextId === userIdRef.current) return;
      userIdRef.current = nextId;
      if (!nextId) {
        setUser(null);
        setProfile(null);
      }
      router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  const value = useMemo(() => ({ user, profile, refreshProfile }), [user, profile, refreshProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
