import { Flag, ListFilter, Search, UserRound, Users, X } from 'lucide-react';
import Select from './ui/Select';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/taskMeta';
import { isLead } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';

const label = (opts, v) => opts.find((o) => o.value === v)?.label;

export default function TaskFilters({ searchInput, onSearchChange, filters, onFilterChange, onClear }) {
  const { user } = useAuth();
  const { members } = useTeam();
  const lead = isLead(user);
  const { status, priority, assignee, assignment } = filters;

  const assigneeName = assignee === 'me' ? 'Me' : members.find((m) => String(m.id) === String(assignee))?.name;
  const chips = [
    searchInput && { key: 'search', text: `“${searchInput}”`, clear: () => onSearchChange('') },
    status && { key: 'status', text: `Status: ${label(STATUS_OPTIONS, status)}`, clear: () => onFilterChange('status', '') },
    priority && { key: 'priority', text: `Priority: ${label(PRIORITY_OPTIONS, priority)}`, clear: () => onFilterChange('priority', '') },
    assignee && assignment !== 'unassigned' && { key: 'assignee', text: `Assignee: ${assigneeName || '…'}`, clear: () => onFilterChange('assignee', '') },
    assignment && { key: 'assignment', text: assignment === 'assigned' ? 'Assigned only' : 'Unassigned only', clear: () => onFilterChange('assignment', '') },
  ].filter(Boolean);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
          <input type="search" className="input pl-9" placeholder="Search tasks by title…" value={searchInput} onChange={(e) => onSearchChange(e.target.value)} aria-label="Search tasks" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex">
          <Select icon={ListFilter} wrapperClassName="xl:w-40" value={status} onChange={(e) => onFilterChange('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select icon={Flag} wrapperClassName="xl:w-40" value={priority} onChange={(e) => onFilterChange('priority', e.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select icon={UserRound} wrapperClassName="xl:w-44" value={assignment === 'unassigned' ? '' : assignee} disabled={assignment === 'unassigned'}
            onChange={(e) => onFilterChange('assignee', e.target.value)} aria-label="Filter by assignee">
            <option value="">{lead ? 'Any assignee' : 'All my tasks'}</option>
            <option value="me">Assigned to me</option>
            {lead && members.filter((m) => m.id !== user.id).map((m) => <option key={m.id} value={String(m.id)}>{m.name}</option>)}
          </Select>
          <Select icon={Users} wrapperClassName="xl:w-44" value={assignment} onChange={(e) => onFilterChange('assignment', e.target.value)} aria-label="Filter by assignment status">
            <option value="">Any assignment</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </Select>
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <span key={c.key} className="tone-accent inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1 text-xs font-medium">
              {c.text}
              <button type="button" onClick={c.clear} className="rounded-full p-0.5 transition-colors hover:bg-accent/20" aria-label={`Remove filter ${c.text}`}><X className="size-3" /></button>
            </span>
          ))}
          <button type="button" className="text-xs font-medium text-fg-3 transition-colors hover:text-fg" onClick={onClear}>Clear all</button>
        </div>
      )}
    </div>
  );
}
