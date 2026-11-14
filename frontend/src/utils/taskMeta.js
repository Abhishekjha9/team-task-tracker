export const STATUS_OPTIONS = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
];

export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const STATUS_STYLES = {
  todo: { label: 'To Do', badge: 'tone-todo', dot: 'bg-[var(--todo)]' },
  'in-progress': { label: 'In Progress', badge: 'tone-progress', dot: 'bg-[var(--progress)]' },
  done: { label: 'Completed', badge: 'tone-done', dot: 'bg-[var(--done)]' },
};

export const PRIORITY_STYLES = {
  low: { label: 'Low', bars: 1, color: 'var(--prio-low)' },
  medium: { label: 'Medium', bars: 2, color: 'var(--prio-medium)' },
  high: { label: 'High', bars: 3, color: 'var(--prio-high)' },
};

/** Formats a 'YYYY-MM-DD' string without timezone shifts and flags overdue dates. */
export function formatDueDate(dateStr, status) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date - today) / 86400000);
  const label =
    diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : diffDays === -1 ? 'Yesterday'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
  return { label, overdue: diffDays < 0 && status !== 'done', soon: diffDays >= 0 && diffDays <= 2 && status !== 'done' };
}

/**
 * Chart colours are CSS variables (see index.css), validated per theme with the dataviz
 * palette checker. SVG resolves var() itself, so switching theme recolours charts without
 * re-rendering them. Status hues match the badges so a status reads the same everywhere.
 */
export const CHART_COLORS = {
  todo: 'var(--chart-todo)',
  'in-progress': 'var(--chart-progress)',
  done: 'var(--chart-done)',
  assigned: 'var(--chart-assigned)',
  unassigned: 'var(--chart-unassigned)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  cursor: 'var(--chart-cursor)',
};
