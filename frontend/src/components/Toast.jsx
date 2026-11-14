import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(onDismiss, 4000);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const error = toast.type === 'error';
  const Icon = error ? AlertCircle : CheckCircle2;

  return (
    <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.15 } }}
      className="fixed bottom-4 left-4 right-4 z-[70] sm:left-auto" role="status" aria-live="polite">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-elevated px-4 py-3 shadow-[var(--shadow-pop)] sm:max-w-sm">
        <Icon className={`size-5 shrink-0 ${error ? 'text-danger-text' : 'text-success-text'}`} />
        <p className="flex-1 text-sm text-fg">{toast.message}</p>
        <button type="button" className="icon-btn -mr-2 size-7" onClick={onDismiss} aria-label="Dismiss">
          <X className="size-4" />
        </button>
      </div>
    </motion.div>
  );
}
