import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { stagger } from '../utils/motion';
import { Activity, CheckCircle2, ChevronRight, Eye, ListChecks, MoreHorizontal, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';
import Avatar from '../components/Avatar';
import RoleBadge from '../components/RoleBadge';
import DropdownMenu from '../components/ui/DropdownMenu';
import { EmptyState, ErrorState, Skeleton } from '../components/States';
import AddMemberModal from '../components/team/AddMemberModal';
import EditMemberModal from '../components/team/EditMemberModal';
import MemberDetailsModal from '../components/team/MemberDetailsModal';
import RemoveMemberDialog from '../components/team/RemoveMemberDialog';
import { teamService } from '../services/teamService';
import { getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';
import { useToast } from '../context/ToastContext';
import { canAddMember, canManageMember, isLead } from '../utils/permissions';

const ACTIVE_DAYS = 30;

/** Activity derived from the real last sign-in time (only returned to admins/managers). */
function presence(m) {
  if (!m.lastLoginAt) return { label: 'Never signed in', dot: 'bg-fg-3' };
  const days = (Date.now() - new Date(m.lastLoginAt).getTime()) / 86400000;
  return days <= ACTIVE_DAYS ? { label: 'Active', dot: 'bg-[var(--done)]' } : { label: 'Inactive', dot: 'bg-[var(--progress)]' };
}

function Count({ value, tone }) {
  return <span className={`inline-flex min-w-8 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>{value}</span>;
}

function MemberActions({ member, user, onView, onEdit, onRemove }) {
  const manage = canManageMember(user, member);
  return (
    <DropdownMenu
      label={`Actions for ${member.name}`}
      width={176}
      trigger={(p) => <button type="button" {...p} className="icon-btn size-8" aria-label={`Actions for ${member.name}`}><MoreHorizontal className="size-4" /></button>}
      items={[
        { label: 'View details', icon: Eye, onSelect: () => onView(member) },
        { label: 'Edit member', icon: Pencil, onSelect: () => onEdit(member), hidden: !manage },
        'separator',
        { label: 'Remove', icon: Trash2, onSelect: () => onRemove(member), danger: true, hidden: !manage || member.id === user.id },
      ].filter((i, idx, arr) => i !== 'separator' || arr.slice(idx + 1).some((x) => x !== 'separator' && !x.hidden))}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="card divide-y divide-line" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-56" /></div>
        </div>
      ))}
    </div>
  );
}

export default function Team() {
  const { user } = useAuth();
  const notify = useToast();
  const { members, loading, error, refresh } = useTeam();
  const lead = isLead(user);
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [detailsId, setDetailsId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);

  const loadOverview = useCallback(() => {
    teamService.get().then((r) => { setOverview(r.overview); setOverviewError(''); }).catch((err) => setOverviewError(getErrorMessage(err)));
  }, []);
  useEffect(loadOverview, [loadOverview]);
  const refreshAll = () => { refresh(); loadOverview(); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.role.includes(q)) : members;
  }, [members, query]);

  const ov = overview;
  const cards = [
    { label: 'Total Members', value: ov?.totalMembers, icon: Users, hint: ov && `${members.filter((m) => m.role !== 'member').length} admins & managers` },
    { label: 'Active Members', value: ov?.activeMembers, icon: Activity, hint: ov && `Signed in within ${ov.activeWindowDays} days` },
    { label: 'Assigned Tasks', value: ov?.assignedTasks, icon: ListChecks, hint: 'Across the whole team' },
    { label: 'Completed Tasks', value: ov?.completedTasks, icon: CheckCircle2, hint: 'Team-wide, all time' },
  ];
  const handlers = { onView: (m) => setDetailsId(m.id), onEdit: setEditing, onRemove: setRemoving };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`${user.team.name} · manage who is on the team and what they're working on.`}
        actions={canAddMember(user) && <button type="button" className="btn-primary" onClick={() => setAdding(true)}><UserPlus className="size-4" />Add member</button>}
      />

      {overviewError ? (
        <ErrorState compact title="Couldn't load team overview" message={overviewError} onRetry={loadOverview} />
      ) : (
        <motion.section variants={stagger(0.05)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4" aria-label="Team overview">
          {cards.map((c) => <StatsCard key={c.label} {...c} value={c.value ?? '–'} loading={!overview} />)}
        </motion.section>
      )}

      <section className="card overflow-hidden" aria-label="Members">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-fg">Members <span className="font-normal text-fg-3">({members.length})</span></h2>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-3" />
            <input type="search" className="input pl-9" placeholder="Search name, email or role…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search members" />
          </div>
        </div>

        {error ? (
          <div className="p-5"><ErrorState compact title="Couldn't load members" message="Please try again." onRetry={refresh} /></div>
        ) : loading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState bare compact icon={Users} title="No members found" message={query ? 'No one matches your search.' : 'Add your first teammate.'} />
        ) : (
          <>
            <div className="relative hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[13px] text-fg-3">
                    <th scope="col" className="px-5 py-3.5 font-normal">Member</th>
                    <th scope="col" className="px-3 py-3.5 font-normal">Role</th>
                    {lead && <>
                      <th scope="col" className="px-2 py-3.5 text-center font-normal">Assigned</th>
                      <th scope="col" className="px-2 py-3.5 text-center font-normal">Completed</th>
                      <th scope="col" className="px-2 py-3.5 text-center font-normal">In progress</th>
                      <th scope="col" className="px-2 py-3.5 text-center font-normal">Pending</th>
                      <th scope="col" className="hidden px-3 py-3.5 font-normal lg:table-cell">Status</th>
                    </>}
                    <th scope="col" className="hidden px-3 py-3.5 font-normal xl:table-cell">Joined</th>
                    <th scope="col" className="w-14 px-3 py-3.5"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filtered.map((m) => {
                    const p = lead ? presence(m) : null;
                    return (
                      <motion.tr key={m.id} layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="cursor-pointer transition-colors duration-150 hover:bg-surface-2/60" onClick={() => setDetailsId(m.id)}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar user={m} />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-fg">{m.name}{m.id === user.id && <span className="ml-1 font-normal text-fg-3">(you)</span>}</p>
                              <p className="truncate text-xs text-fg-3">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5"><RoleBadge role={m.role} /></td>
                        {lead && <>
                          <td className="px-2 py-3.5 text-center"><Count value={m.stats.total} tone="tone-neutral" /></td>
                          <td className="px-2 py-3.5 text-center"><Count value={m.stats.done} tone="tone-done" /></td>
                          <td className="px-2 py-3.5 text-center"><Count value={m.stats.inProgress} tone="tone-progress" /></td>
                          <td className="px-2 py-3.5 text-center"><Count value={m.stats.todo} tone="tone-todo" /></td>
                          <td className="hidden px-3 py-3.5 lg:table-cell">
                            <span className="inline-flex items-center gap-2 whitespace-nowrap text-fg-2"><span className={`size-2 rounded-full ${p.dot}`} />{p.label}</span>
                          </td>
                        </>}
                        <td className="hidden whitespace-nowrap px-3 py-3.5 text-fg-3 xl:table-cell">{new Date(m.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                        <td className="px-3 py-3.5 text-right" onClick={(e) => e.stopPropagation()}><MemberActions member={m} user={user} {...handlers} /></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line md:hidden">
              {filtered.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setDetailsId(m.id)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/60">
                    <Avatar user={m} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">{m.name} <RoleBadge role={m.role} /></p>
                      <p className="truncate text-xs text-fg-3">{m.email}</p>
                      {lead && <p className="mt-1 text-xs text-fg-2">{m.stats.total} assigned · {m.stats.done} done · {m.stats.inProgress} in progress · {m.stats.todo} pending</p>}
                    </div>
                    <ChevronRight className="size-4 text-fg-3" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {adding && <AddMemberModal open onClose={() => setAdding(false)} onAdded={(m) => { notify(`${m.name} was added to the team`); refreshAll(); }} />}
      {detailsId && (
        <MemberDetailsModal key={detailsId} memberId={detailsId} onClose={() => setDetailsId(null)}
          onEdit={(m) => { setDetailsId(null); setEditing(m); }}
          onRemove={(m) => { setDetailsId(null); setRemoving(members.find((x) => x.id === m.id) || m); }} />
      )}
      {editing && (
        <EditMemberModal member={editing} onClose={() => setEditing(null)}
          onSaved={(m) => { setEditing(null); notify(`${m.name} was updated`); refreshAll(); }} />
      )}
      {removing && (
        <RemoveMemberDialog member={removing} members={members} onClose={() => setRemoving(null)}
          onRemoved={(res) => {
            const moved = res.tasksReassigned ? `${res.tasksReassigned} task(s) reassigned` : `${res.tasksUnassigned} task(s) unassigned`;
            notify(`${removing.name} was removed · ${moved}`);
            setRemoving(null);
            refreshAll();
          }} />
      )}
    </div>
  );
}
