'use client';

import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { cx } from './ui';

const DropdownContext = createContext(() => {});

// Small accessible menu: closes on outside click, Esc and item selection.
export function Dropdown({ trigger, label, triggerClassName, align = 'end', children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={cx(
            'absolute top-full z-50 mt-2 min-w-48 origin-top animate-pop rounded-2xl border border-ink-200 bg-white p-1.5 shadow-lift',
            align === 'end' ? 'end-0' : 'start-0'
          )}
        >
          <DropdownContext.Provider value={() => setOpen(false)}>{children}</DropdownContext.Provider>
        </div>
      )}
    </div>
  );
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-ink-800 transition-colors hover:bg-ink-100 focus-visible:bg-ink-100';

export function DropdownItem({ href, onSelect, danger, children, ...props }) {
  const close = useContext(DropdownContext);
  const className = cx(itemClass, danger && 'text-danger-600 hover:bg-danger-50');
  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={close} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      role="menuitem"
      className={className}
      onClick={() => {
        close();
        onSelect?.();
      }}
      {...props}
    >
      {children}
    </button>
  );
}
