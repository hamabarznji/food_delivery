'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase/client';
import { safeNext } from '@/src/lib/format';
import { useI18n, useToast } from './providers';
import { Button, Field, FormError, TextField, cx, inputClass } from './ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Translate Supabase Auth errors into friendly, non-leaky messages.
function useAuthError() {
  const { t } = useI18n();
  return (error) => {
    const code = error?.code || '';
    const msg = error?.message || '';
    if (code === 'invalid_credentials' || /invalid login/i.test(msg)) return t('auth.invalidCredentials');
    if (code === 'email_not_confirmed' || /not confirmed/i.test(msg)) return t('auth.emailNotConfirmed');
    if (code === 'user_already_exists' || code === 'email_exists' || /already registered/i.test(msg)) return t('auth.emailTaken');
    if (code === 'weak_password' || /password should/i.test(msg)) return t('auth.weakPassword');
    if (code === 'email_address_invalid' || code === 'validation_failed') return t('auth.invalidEmail');
    if (error?.status === 429 || /rate limit/i.test(code + msg)) return t('auth.rateLimited');
    if (/session|token|expired/i.test(msg)) return t('auth.linkInvalid');
    if (/fetch|network/i.test(msg)) return t('error.network');
    return t('error.generic');
  };
}

function PasswordField({ label, value, onChange, error, autoComplete, hint }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error} hint={hint}>
      {(a11y) => (
        <div className="relative">
          <input
            {...a11y}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            dir="ltr"
            required
            className={cx(inputClass, 'pe-12')}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute end-1 top-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-800"
            aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
            aria-pressed={visible}
          >
            {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </div>
      )}
    </Field>
  );
}

function AuthHeader({ title, subtitle }) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-600">{subtitle}</p>}
    </div>
  );
}

function Notice({ children }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-herb-600/20 bg-herb-50 p-4 text-sm text-herb-700">
      <MailCheck size={20} className="mt-0.5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}

const linkClass = 'font-semibold text-brand-700 hover:text-brand-800 hover:underline';

export function LoginForm({ next, linkError }) {
  const { t } = useI18n();
  const authError = useAuthError();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(linkError ? t('auth.linkInvalid') : '');
  const [loading, setLoading] = useState(false);
  const target = safeNext(next);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!EMAIL.test(email.trim())) found.email = t('auth.invalidEmail');
    if (!password) found.password = t('common.required');
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setLoading(false);
      return setFormError(authError(error));
    }
    // full navigation: every server component re-renders with the new session
    window.location.assign(target);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <AuthHeader title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />
      <FormError>{formError}</FormError>
      <TextField label={t('auth.email')} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="email" autoFocus required />
      <PasswordField label={t('auth.password')} value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/forgot-password" className={cx(linkClass, 'text-sm')}>{t('auth.forgot')}</Link>
      </div>
      <Button type="submit" size="lg" block loading={loading}>
        {loading ? t('auth.loggingIn') : t('auth.login')}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const authError = useAuthError();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!EMAIL.test(email.trim())) return setError(t('auth.invalidEmail'));
    setError('');
    setLoading(true);
    const { error: failure } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (failure && (failure.status === 429 || /fetch|network/i.test(failure.message))) return setFormError(authError(failure));
    setSent(true); // same answer whether or not the account exists
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <AuthHeader title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} />
      {sent ? (
        <Notice>{t('auth.resetSent')}</Notice>
      ) : (
        <>
          <FormError>{formError}</FormError>
          <TextField label={t('auth.email')} type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} error={error} autoComplete="email" autoFocus required />
          <Button type="submit" size="lg" block loading={loading}>
            {loading ? t('auth.sending') : t('auth.sendReset')}
          </Button>
        </>
      )}
      <p className="pt-2 text-center text-sm">
        <Link href="/login" className={linkClass}>{t('auth.backToLogin')}</Link>
      </p>
    </form>
  );
}

// Used on /reset-password (after the e-mail link) and in account settings.
export function NewPasswordForm({ redirectTo, compact = false }) {
  const { t } = useI18n();
  const toast = useToast();
  const authError = useAuthError();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const found = {};
    if (password.length < 8) found.password = t('auth.weakPassword');
    if (confirm !== password) found.confirm = t('auth.passwordMismatch');
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;

    setLoading(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) return setFormError(error.code === 'same_password' ? t('auth.weakPassword') : authError(error));
    toast.success(t('auth.passwordUpdated'));
    setPassword('');
    setConfirm('');
    if (redirectTo) window.location.assign(redirectTo);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {!compact && <AuthHeader title={t('auth.resetTitle')} />}
      <FormError>{formError}</FormError>
      <PasswordField label={t('auth.newPassword')} value={password} onChange={setPassword} error={errors.password} hint={t('auth.weakPassword')} autoComplete="new-password" />
      <PasswordField label={t('auth.confirmPassword')} value={confirm} onChange={setConfirm} error={errors.confirm} autoComplete="new-password" />
      <Button type="submit" size={compact ? 'md' : 'lg'} block={!compact} loading={loading}>
        {t('auth.updatePassword')}
      </Button>
    </form>
  );
}
