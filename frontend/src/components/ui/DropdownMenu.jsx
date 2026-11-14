import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { popover } from '../../utils/motion';

/**
 * Accessible menu rendered in a portal with fixed positioning, so it is never clipped by
 * scrolling tables. Closes on outside click, Escape, scroll and resize. Arrow keys move focus.
 *
 * items: [{ label, icon, onSelect, danger?, hidden? } | 'separator']
 */
export default function DropdownMenu({ trigger, items, align = 'end', width = 192, label = 'Menu', header }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const visible = items.filter((i) => i === 'separator' || !i.hidden);

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = align === 'end' ? r.right - width : r.left;
    const menuH = menuRef.current?.offsetHeight || 0;
    const below = r.bottom + 6;
    const top = below + menuH > window.innerHeight - 8 && r.top - menuH - 6 > 8 ? r.top - menuH - 6 : below;
    setPos({ top, left: Math.max(8, Math.min(left, window.innerWidth - width - 8)) });
  }, [align, width]);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { close(); btnRef.current?.focus(); }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const els = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
        const i = els.indexOf(document.activeElement);
        els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus());
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return (
    <>
      {trigger({ ref: btnRef, onClick: (e) => { e.stopPropagation(); setOpen((o) => !o); }, 'aria-haspopup': 'menu', 'aria-expanded': open })}
      {createPortal(
        <AnimatePresence>
        {open && (
        <motion.div
          {...popover}
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
          className="fixed z-[60] origin-top rounded-xl border border-line bg-elevated p-1 shadow-[var(--shadow-pop)]"
          onClick={(e) => e.stopPropagation()}
        >
          {header && <div className="border-b border-line px-3 py-2.5">{header}</div>}
          <div className={header ? 'pt-1' : ''}>
            {visible.map((item, idx) =>
              item === 'separator' ? (
                <div key={`sep-${idx}`} className="my-1 h-px bg-line" />
              ) : (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); item.onSelect(); }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors focus-visible:bg-surface-2 ${item.danger ? 'text-danger-text hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)]' : 'text-fg hover:bg-surface-2'}`}
                >
                  {item.icon && <item.icon className={`size-4 ${item.danger ? '' : 'text-fg-3'}`} />}
                  {item.label}
                </button>
              ),
            )}
          </div>
        </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
