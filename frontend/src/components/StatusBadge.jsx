import { ChevronDown } from 'lucide-react';
import { STATUS_OPTIONS, STATUS_STYLES } from '../utils/taskMeta';

/** Status badge that doubles as a quick-change dropdown (native select for accessibility). */
export default function StatusBadge({ status, onChange, disabled, readOnly }) {
  const s = STATUS_STYLES[status];
  const interactive = !disabled && !readOnly;
  return (
    <label className={`relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-1 pl-2.5 text-xs font-medium transition-[filter,opacity] duration-200 ${readOnly ? 'pr-2.5' : 'pr-6'} ${s.badge} ${disabled && !readOnly ? 'opacity-60' : ''} ${interactive ? 'cursor-pointer hover:brightness-110' : ''}`}>
      <span className={`size-1.5 rounded-full ${s.dot}`} />
      {s.label}
      {!readOnly && (
        <>
          <ChevronDown className="pointer-events-none absolute right-1.5 size-3 opacity-70" />
          <select aria-label="Change status" className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed" value={status} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </>
      )}
    </label>
  );
}
