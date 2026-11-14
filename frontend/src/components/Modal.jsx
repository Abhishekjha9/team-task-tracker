import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ease } from '../utils/motion';

export default function Modal({ open, onClose, title, description, children, size = 'md' }) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const prevFocus = document.activeElement;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      // Keep Tab focus inside the dialog.
      if (e.key === 'Tab' && panelRef.current) {
        const els = panelRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const list = [...els].filter((el) => !el.disabled);
        if (!list.length) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    if (!panelRef.current?.contains(document.activeElement)) panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  const width = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return (
    <AnimatePresence>
      {open && (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <motion.div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] dark:bg-black/65" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.14, ease } }}
        className={`relative flex max-h-[calc(100dvh-1.5rem)] w-full ${width} flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-[var(--shadow-pop)] outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="modal-title" className="text-base font-semibold text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-2">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1 size-8" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
