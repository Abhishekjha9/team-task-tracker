import { CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import StatusBadge from './StatusBadge';
import PriorityIndicator from './PriorityIndicator';
import AssigneeChip from './AssigneeChip';
import TaskRowActions from './TaskRowActions';
import { formatDueDate } from '../utils/taskMeta';

export function DueDate({ date, status, empty = null }) {
  const due = formatDueDate(date, status);
  if (!due) return empty;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${due.overdue ? 'font-medium text-danger-text' : due.soon ? 'text-warning-text' : 'text-fg-2'}`}>
      <CalendarDays className="size-3.5" />
      {due.overdue ? `Overdue · ${due.label}` : due.label}
    </span>
  );
}

/** Mobile / narrow representation of a task (TaskTable uses a table on wider screens). */
export default function TaskCard({ task, pending, currentUserId, onStatusChange, onEdit, onDelete }) {
  const done = task.status === 'done';
  const perms = task.permissions || {};
  const showCreator = task.creator && task.creator.id !== task.assignee?.id;
  return (
    <motion.li layout="position" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card p-4 transition-colors duration-200 hover:border-line-strong">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className={`truncate text-sm font-semibold ${done ? 'text-fg-3 line-through decoration-fg-3/50' : 'text-fg'}`}>{task.title}</h3>
          <p className={`mt-1 line-clamp-2 text-sm ${task.description ? 'text-fg-2' : 'italic text-fg-3'}`}>{task.description || 'No description'}</p>
        </div>
        <TaskRowActions task={task} onEdit={onEdit} onDelete={onDelete} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge status={task.status} disabled={pending || !perms.canChangeStatus} onChange={(s) => onStatusChange(task, s)} />
        <PriorityIndicator priority={task.priority} />
        <DueDate date={task.due_date} status={task.status} />
        <AssigneeChip assignee={task.assignee} currentUserId={currentUserId} />
        {showCreator && <span className="text-xs text-fg-3">by {task.creator.id === currentUserId ? 'you' : task.creator.name}</span>}
      </div>
    </motion.li>
  );
}
