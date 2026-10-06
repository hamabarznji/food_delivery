'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Loader2, Minus, Plus, Star, UtensilsCrossed, X } from 'lucide-react';
import { SUPABASE_URL } from '@/src/lib/supabase/config';
import { formatIQD } from '@/src/lib/format';
import { cx, buttonClass, inputClass } from '@/src/lib/styles';
import { useI18n } from './providers';

export { cx, buttonClass, inputClass };

// ---------------------------------------------------------------- buttons
export function Button({ variant, size, block, loading = false, className, children, disabled, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cx(buttonClass({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Spinner({ className, size = 24 }) {
  const { t } = useI18n();
  return (
    <span role="status" className={cx('inline-flex text-brand-600', className)}>
      <Loader2 size={size} className="animate-spin" aria-hidden />
      <span className="sr-only">{t('common.loading')}</span>
    </span>
  );
}

// ---------------------------------------------------------------- form fields
// Label + control + hint/error, wired together for assistive tech.
export function Field({ label, error, hint, optional, className, children }) {
  const id = useId();
  const { t } = useI18n();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink-800">
          <span>{label}</span>
          {optional && <span className="text-xs font-normal text-ink-500">{t('common.optional')}</span>}
        </label>
      )}
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({ label, error, hint, optional, className, inputClassName, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {(a11y) => <input {...a11y} className={cx(inputClass, inputClassName)} {...props} />}
    </Field>
  );
}

export function TextArea({ label, error, hint, optional, className, rows = 3, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {(a11y) => <textarea {...a11y} rows={rows} className={cx(inputClass, 'h-auto resize-none py-2.5')} {...props} />}
    </Field>
  );
}

export function SelectField({ label, error, hint, optional, className, children, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} optional={optional} className={className}>
      {(a11y) => (
        <select {...a11y} className={cx(inputClass, 'pe-8')} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Switch({ checked, onChange, label, disabled, className }) {
  return (
    <label className={cx('inline-flex items-center gap-2.5 text-sm text-ink-800', disabled && 'opacity-60', className)}>
      <input
        type="checkbox"
        role="switch"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-ink-300 transition-colors peer-checked:bg-herb-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-200 after:absolute after:start-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 rtl:peer-checked:after:-translate-x-5"
      />
      {label && <span>{label}</span>}
    </label>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger-600/20 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------- feedback
const BADGE_TONES = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-100 text-brand-800',
  success: 'bg-herb-100 text-herb-700',
  warning: 'bg-saffron-100 text-saffron-700',
  danger: 'bg-danger-50 text-danger-700',
  dark: 'bg-ink-900/80 text-white backdrop-blur',
};
export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

export const STATUS_TONES = {
  pending: 'warning',
  confirmed: 'brand',
  preparing: 'brand',
  ready: 'success',
  out_for_delivery: 'success',
  delivered: 'neutral',
  cancelled: 'danger',
};
export function StatusBadge({ status }) {
  const { t } = useI18n();
  return <Badge tone={STATUS_TONES[status]}>{t(`status.${status}`)}</Badge>;
}

export function EmptyState({ icon, title, body, children, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {icon || <UtensilsCrossed size={26} aria-hidden />}
      </span>
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function Price({ value, className }) {
  return (
    <span dir="ltr" className={cx('tabular-nums', className)}>
      {formatIQD(value)}
    </span>
  );
}

export function Rating({ value, count, className }) {
  const { t } = useI18n();
  if (!count) return <Badge tone="brand" className={className}>{t('restaurant.newRating')}</Badge>;
  return (
    <span className={cx('inline-flex items-center gap-1 text-sm font-semibold text-ink-900', className)}>
      <Star size={14} className="fill-saffron-400 text-saffron-400" aria-hidden />
      <span dir="ltr">{Number(value).toFixed(1)}</span>
      <span className="font-normal text-ink-500" dir="ltr">({count})</span>
    </span>
  );
}

export function QuantityStepper({ value, onChange, min = 1, max = 50, size = 'md', disabled }) {
  const { t } = useI18n();
  const btn = cx(
    'flex items-center justify-center rounded-full border border-ink-200 bg-white text-ink-800 transition-colors hover:border-brand-500 hover:text-brand-700 disabled:opacity-40 disabled:pointer-events-none',
    size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  );
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={t('item.quantity')}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={disabled || value <= min} aria-label={t('item.decrease')}>
        <Minus size={16} aria-hidden />
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label={t('item.increase')}>
        <Plus size={16} aria-hidden />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- images
const isLocalHost = (src) => /^https?:\/\/(localhost|127\.0\.0\.1)/.test(src);

// Food / restaurant imagery with a graceful placeholder. Parent must be
// `relative` with a fixed size or aspect ratio.
export function FoodImage({ src, alt, sizes = '(max-width: 640px) 100vw, 33vw', className, priority }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 to-saffron-100 text-brand-300">
        <UtensilsCrossed size={32} aria-hidden />
      </div>
    );
  }
  const optimisable = src.startsWith('/') || (SUPABASE_URL && src.startsWith(SUPABASE_URL) && !isLocalHost(src));
  return (
    <Image
      src={src}
      alt={alt || ''}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!optimisable}
      onError={() => setFailed(true)}
      className={cx('object-cover', className)}
    />
  );
}

export function Avatar({ src, name, size = 36 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-800"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

// ---------------------------------------------------------------- dialogs
// Built on <dialog>: native focus trapping, Esc to close and inert background.
export function Modal({ open, onClose, title, children, footer, size = 'md', side = false }) {
  const ref = useRef(null);
  const { t } = useI18n();
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const widths = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-start backdrop:bg-ink-900/50 backdrop:backdrop-blur-[2px] open:flex',
        'fixed inset-0 h-dvh w-screen',
        side ? 'items-stretch justify-end' : 'items-end justify-center sm:items-center sm:p-6'
      )}
    >
      {open && (
        <div
          className={cx(
            'flex w-full flex-col bg-white shadow-pop',
            side
              ? 'h-full max-w-md animate-slide-in'
              : cx('max-h-[92dvh] animate-pop rounded-t-3xl sm:rounded-3xl', widths[size])
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
            <h2 id={titleId} className="truncate text-lg font-bold text-ink-900">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-me-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
              aria-label={t('common.close')}
            >
              <X size={20} aria-hidden />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && <footer className="shrink-0 border-t border-ink-100 px-5 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

// const confirm = useConfirm(); if (await confirm({ title, body, danger })) ...
export function useConfirm() {
  const { t } = useI18n();
  const [state, setState] = useState(null);

  const confirm = useCallback((options) => new Promise((resolve) => setState({ ...options, resolve })), []);
  const settle = (answer) => {
    state?.resolve(answer);
    setState(null);
  };

  const dialog = (
    <Modal
      open={Boolean(state)}
      onClose={() => settle(false)}
      title={state?.title || t('common.confirm')}
      size="sm"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => settle(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => settle(true)}>
            {state?.confirmLabel || t('common.confirm')}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-ink-600">{state?.body}</p>
    </Modal>
  );

  return [confirm, dialog];
}
