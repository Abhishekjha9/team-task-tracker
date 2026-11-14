import { useEffect, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { softSpring } from '../../utils/motion';
import AnimatedNumber from '../ui/AnimatedNumber';
import Modal from '../Modal';
import Avatar from '../Avatar';
import RoleBadge from '../RoleBadge';
import StatusBadge from '../StatusBadge';
import FormError from '../ui/FormError';
import { DueDate } from '../TaskCard';
import { teamService } from '../../services/teamService';
import { taskService } from '../../services/taskService';
import { getErrorMessage } from '../../services/api';
import { canManageMember, isLead } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs text-fg-3">{tone && <span className="size-1.5 rounded-full" style={{ background: tone }} />}{label}</p>
      <p className="mt-0.5 text-xl font-semibold text-fg"><AnimatedNumber value={value} /></p>
    </div>
  );
}

export default function MemberDetailsModal({ memberId, onClose, onEdit, onRemove }) {
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [tasks, setTasks] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([teamService.member(memberId), taskService.list({ assignedTo: memberId, limit: 50 })])
      .then(([m, t]) => { if (alive) { setMember(m); setTasks(t); } })
      .catch((err) => alive && setError(getErrorMessage(err, 'Could not load this member.')));
    return () => { alive = false; };
  }, [memberId]);

  const canManage = member && canManageMember(user, member);
  const isSelf = member?.id === user.id;
  const s = member?.stats;

  return (
    <Modal open onClose={onClose} title="Member details" size="lg">
      <FormError message={error} className="mb-4" />
      {!member ? (
        !error && <div className="flex justify-center py-12"><Loader2 className="size-5 animate-spin text-fg-3" /></div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar user={member} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-fg">
                {member.name}{isSelf && <span className="text-sm font-normal text-fg-3">(you)</span>} <RoleBadge role={member.role} />
              </p>
              <p className="truncate text-sm text-fg-2">{member.email}</p>
              <p className="mt-0.5 text-xs text-fg-3">Joined {new Date(member.joinedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
            {canManage && <button type="button" className="btn-secondary" onClick={() => onEdit(member)}><Pencil className="size-4" />Edit</button>}
          </div>

          {s ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Total" value={s.total} />
                <Stat label="Completed" value={s.done} tone="var(--done)" />
                <Stat label="In progress" value={s.inProgress} tone="var(--progress)" />
                <Stat label="Pending" value={s.todo} tone="var(--todo)" />
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-fg-3"><span>Completion rate</span><span className="font-semibold tabular-nums text-fg">{s.completionRate}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={s.completionRate} aria-valuemin={0} aria-valuemax={100} aria-label="Completion rate">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-accent to-[var(--chart-assigned)]" initial={{ width: 0 }} animate={{ width: `${s.completionRate}%` }} transition={{ ...softSpring, delay: 0.1 }} />
                </div>
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5 text-xs text-fg-3">Task statistics for other members are visible to admins and managers.</p>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold text-fg">Assigned tasks {tasks && <span className="font-normal text-fg-3">({tasks.totalTasks})</span>}</h3>
            {!tasks ? null : tasks.tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line-strong py-6 text-center text-sm text-fg-3">
                {isLead(user) || isSelf ? 'No tasks assigned.' : 'No assigned tasks visible to you.'}
              </p>
            ) : (
              <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-xl border border-line">
                {tasks.tasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-surface-2/60">
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">{t.title}</span>
                    <span className="hidden sm:inline"><DueDate date={t.due_date} status={t.status} /></span>
                    <StatusBadge status={t.status} readOnly />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-between border-t border-line pt-4">
            {canManage && !isSelf ? (
              <button type="button" className="btn-ghost text-danger-text hover:bg-[color-mix(in_oklab,var(--danger)_12%,transparent)] hover:text-danger-text" onClick={() => onRemove(member)}>
                <Trash2 className="size-4" />Remove from team
              </button>
            ) : <span />}
            <button type="button" className="btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
