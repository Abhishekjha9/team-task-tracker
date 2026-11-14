import { UserRoundX } from 'lucide-react';
import Avatar from './Avatar';

export default function AssigneeChip({ assignee, currentUserId }) {
  if (!assignee) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-line-strong px-2 py-0.5 text-xs text-fg-3">
        <UserRoundX className="size-3.5" />Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-fg" title={`Assigned to ${assignee.name} (${assignee.email})`}>
      <Avatar user={assignee} size="sm" />
      <span className="truncate">{assignee.id === currentUserId ? 'You' : assignee.name}</span>
    </span>
  );
}
