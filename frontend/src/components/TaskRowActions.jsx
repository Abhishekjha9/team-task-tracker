import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import DropdownMenu from './ui/DropdownMenu';

/** "…" menu for a task; items follow the per-task permissions returned by the API. */
export default function TaskRowActions({ task, onEdit, onDelete }) {
  const perms = task.permissions || {};
  if (!perms.canEdit && !perms.canDelete) return <span className="inline-block size-8" aria-hidden="true" />;
  return (
    <DropdownMenu
      label={`Actions for ${task.title}`}
      width={168}
      trigger={(p) => (
        <button type="button" {...p} className="icon-btn size-8" aria-label={`Actions for ${task.title}`}><MoreHorizontal className="size-4" /></button>
      )}
      items={[
        { label: 'Edit task', icon: Pencil, onSelect: () => onEdit(task), hidden: !perms.canEdit },
        { label: 'Delete', icon: Trash2, onSelect: () => onDelete(task), danger: true, hidden: !perms.canDelete },
      ]}
    />
  );
}
