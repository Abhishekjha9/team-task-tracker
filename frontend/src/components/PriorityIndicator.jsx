import { PRIORITY_STYLES } from '../utils/taskMeta';

export default function PriorityIndicator({ priority }) {
  const p = PRIORITY_STYLES[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-fg-2" title={`${p.label} priority`}>
      <span className="flex h-3 items-end gap-0.5" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className="w-[3px] rounded-sm" style={{ height: `${n * 4}px`, background: n <= p.bars ? p.color : 'var(--surface-3)' }} />
        ))}
      </span>
      {p.label}
    </span>
  );
}
