import clsx from 'clsx';
import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

/** Small shared primitives, kept in one module so the visual language stays consistent. */

// --- Spinner -----------------------------------------------------------------
export function Spinner({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2 text-sm text-ink-muted', className)} role="status">
      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-80"
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && <span>{label}</span>}
    </div>
  );
}

// --- Button ------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  size?: 'sm' | 'md';
}

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-card hover:bg-brand-700 disabled:bg-brand-300',
  secondary:
    'border border-surface-border bg-white text-ink hover:border-brand-200 hover:bg-brand-50 disabled:text-ink-subtle',
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-clay-600 text-white hover:bg-clay-700 disabled:bg-clay-500/50',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed',
        size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
        BUTTON_VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {isLoading && <Spinner className="text-current" />}
      {children}
    </button>
  );
});

// --- Inputs ------------------------------------------------------------------
interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function Input({ label, error, hint, id, className, ...rest }, ref) {
    const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, '-')}`;
    return (
      <div>
        <label className="label" htmlFor={inputId}>
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={clsx('input', error && 'border-red-400 focus:border-red-500 focus:ring-red-500', className)}
          {...rest}
        />
        {error ? (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-red-600">
            {error}
          </p>
        ) : (
          hint && <p className="mt-1 text-xs text-ink-subtle">{hint}</p>
        )}
      </div>
    );
  },
);

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }
>(function TextArea({ label, className, id, ...rest }, ref) {
  return (
    <div>
      {label && (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      )}
      <textarea ref={ref} id={id} className={clsx('input resize-none', className)} {...rest} />
    </div>
  );
});

// --- Badge -------------------------------------------------------------------
type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted',
  success: 'bg-sage-50 text-sage-700',
  warning: 'bg-sand-50 text-sand-700',
  danger: 'bg-clay-50 text-clay-700',
  brand: 'bg-brand-50 text-brand-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// --- Alert -------------------------------------------------------------------
export function Alert({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'warning' }) {
  return (
    <div
      role="alert"
      className={clsx(
        'rounded-lg border px-3 py-2 text-sm',
        tone === 'danger'
          ? 'border-clay-100 bg-clay-50 text-clay-700'
          : 'border-sand-100 bg-sand-50 text-sand-700',
      )}
    >
      {children}
    </div>
  );
}

// --- Confirm dialog ----------------------------------------------------------
export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  isBusy = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <div className="text-sm text-ink-muted">{description}</div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isBusy}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --- Modal -------------------------------------------------------------------
export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  // Escape closes, and the body is locked so the page behind cannot scroll.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-lg animate-fade-in rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Empty state -------------------------------------------------------------
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
