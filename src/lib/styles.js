// Class-name helpers shared by Server and Client Components.
export const cx = (...parts) => parts.filter(Boolean).join(' ');

const BUTTON_VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-white text-ink-900 border border-ink-200 hover:border-ink-300 hover:bg-ink-50',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  dangerGhost: 'text-danger-600 hover:bg-danger-50',
};
const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-full',
};

export function buttonClass({ variant = 'primary', size = 'md', block = false } = {}) {
  return cx(
    'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap select-none',
    'transition-[background-color,border-color,transform,box-shadow] duration-150 active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    block && 'w-full'
  );
}

export const inputClass =
  'block w-full rounded-xl border border-ink-200 bg-white px-3.5 h-11 text-[15px] text-ink-900 placeholder:text-ink-400 ' +
  'transition-colors hover:border-ink-300 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 ' +
  'disabled:bg-ink-50 disabled:text-ink-500 aria-[invalid=true]:border-danger-600 aria-[invalid=true]:focus:ring-danger-50';
