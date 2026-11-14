import { AlertCircle } from 'lucide-react';

/** Form-level error banner and per-field message, shared by every form. */
export default function FormError({ message, className = '' }) {
  if (!message) return null;
  return (
    <p role="alert" className={`flex items-start gap-2 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_30%,transparent)] bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] px-3 py-2 text-sm text-danger-text ${className}`}>
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </p>
  );
}

export function FieldError({ message }) {
  return message ? <p className="mt-1 text-xs text-danger-text">{message}</p> : null;
}
