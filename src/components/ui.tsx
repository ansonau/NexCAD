import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * NexCAD design system — shared primitives.
 * Light "precision instrument" theme: floating frosted panels over the canvas,
 * hairline borders, one accent blue, mono numerals for dimensions.
 */

export const panelClass =
  'rounded-2xl border border-line bg-white/85 shadow-panel backdrop-blur-xl';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';
const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getVisibleFocusable(root: HTMLElement | null): HTMLElement[] {
  return [...(root?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])].filter((el) => el.offsetParent !== null);
}

export function IconButton({
  title,
  onClick,
  disabled,
  active,
  children,
  className = '',
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] transition-colors duration-150 active:scale-95 disabled:pointer-events-none disabled:opacity-35 ${focusRing} ${
        active
          ? 'bg-accent-soft text-accent hover:text-accent-strong'
          : 'text-ink-2 hover:bg-slate-900/5 hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  onClick,
  disabled,
  children,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-accent px-3.5 text-[13px] font-medium text-white shadow-sm transition-colors duration-150 hover:bg-accent-strong active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  onClick,
  disabled,
  children,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:bg-slate-900/5 hover:text-ink active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

export function OutlineButton({
  onClick,
  disabled,
  children,
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white/70 px-3.5 text-[13px] font-medium text-ink-2 transition-colors duration-150 hover:border-line-strong hover:bg-white hover:text-ink active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${focusRing} ${className}`}
    >
      {children}
    </button>
  );
}

/** Micro uppercase section label, e.g. "SIZE (mm)" above a field group. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-3">
      {children}
    </p>
  );
}

export const fieldClass = `h-9 w-full rounded-[10px] border border-line bg-white/80 px-2.5 text-[13px] text-ink transition-colors duration-150 placeholder:text-ink-3 hover:border-line-strong focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-accent/25`;

export const numberFieldClass = `${fieldClass} font-mono tabular-nums`;

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[11px] font-medium text-ink-3">{children}</span>;
}

export function Dialog({
  title,
  onClose,
  width = 'w-80',
  children,
}: {
  title: string;
  onClose: () => void;
  width?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      const focusable = getVisibleFocusable(dialogRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        dialogRef.current?.focus();
      } else if (e.shiftKey ? document.activeElement === focusable[0] : document.activeElement === focusable.at(-1)) {
        e.preventDefault();
        (e.shiftKey ? focusable.at(-1) : focusable[0])?.focus();
      }
    };
    (getVisibleFocusable(dialogRef.current)[0] ?? dialogRef.current)?.focus();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, [onClose]);

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-label={title}
        className={`${width} max-w-[calc(100vw-1.5rem)] max-h-[80vh] animate-pop-in overflow-y-auto rounded-2xl border border-line bg-white/95 p-4 shadow-pop backdrop-blur-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold tracking-tight text-ink">{title}</p>
          <IconButton title={t('common.close')} onClick={onClose} className="-mr-1 h-7 w-7">
            <X size={15} />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );

  return typeof document === 'undefined' ? dialog : createPortal(dialog, document.body);
}

export function StepperField({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.5,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  // 外部改變 value 時（選到其他物件、拖曳等），若非編輯中就同步顯示
  useEffect(() => {
    if (!focused) setDraft(null);
  }, [value, focused]);

  const clamp = useCallback(
    (v: number) => {
      let c = v;
      if (min !== undefined && c < min) c = min;
      if (max !== undefined && c > max) c = max;
      return c;
    },
    [min, max],
  );

  const adjust = (delta: number) => {
    const v = clamp(valueRef.current + delta * step);
    onChange(v);
  };

  const startHold = (delta: number) => {
    adjust(delta);
    holdRef.current = setInterval(() => adjust(delta), 120);
  };

  const stopHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  useEffect(() => () => stopHold(), []);

  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-stretch gap-px">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={min !== undefined && value <= min}
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onClick={(e) => e.preventDefault()}
          className="flex w-6 shrink-0 cursor-pointer items-center justify-center rounded-l-[10px] border border-line bg-white/80 text-ink-2 transition-colors duration-100 hover:bg-slate-900/5 hover:text-ink active:bg-slate-900/8 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
        >
          <Minus size={11} strokeWidth={2} />
        </button>
        <input
          type="number"
          className="min-w-0 flex-1 border-y border-line bg-white/80 px-1 py-1.5 text-center font-mono text-[13px] tabular-nums text-ink transition-colors duration-150 hover:border-line-strong focus:border-accent-line focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/25"
          value={draft ?? value}
          min={min}
          max={max}
          step={step}
          onFocus={() => { setFocused(true); setDraft(String(value)); }}
          onBlur={(e) => {
            setFocused(false);
            setDraft(null);
            const v = Number.parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(clamp(v));
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = Number.parseFloat(e.target.value);
            if (!Number.isNaN(v) && (min === undefined || v >= min) && (max === undefined || v <= max)) {
              onChange(v);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); adjust(1); }
            if (e.key === 'ArrowDown') { e.preventDefault(); adjust(-1); }
          }}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={max !== undefined && value >= max}
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onClick={(e) => e.preventDefault()}
          className="flex w-6 shrink-0 cursor-pointer items-center justify-center rounded-r-[10px] border border-line bg-white/80 text-ink-2 transition-colors duration-100 hover:bg-slate-900/5 hover:text-ink active:bg-slate-900/8 disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
        >
          <Plus size={11} strokeWidth={2} />
        </button>
      </div>
    </label>
  );
}
