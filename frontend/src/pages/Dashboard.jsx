import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { stagger } from '../utils/motion';
import { ArrowRight, CalendarDays, CheckCircle2, CircleDot, ClipboardList, ListTodo, Plus, UserCheck, UserRoundX } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatsCard from '../components/StatsCard';
import TaskTable from '../components/TaskTable';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import ChartCard from '../components/charts/ChartCard';
import StatusDonut from '../components/charts/StatusDonut';
import AssignmentChart from '../components/charts/AssignmentChart';
import WorkloadChart from '../components/charts/WorkloadChart';
import TrendChart from '../components/charts/TrendChart';
import { EmptyState, ErrorState, TaskListSkeleton } from '../components/States';
import { useAnalytics } from '../hooks/useAnalytics';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isLead } from '../utils/permissions';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return d;
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const short = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-[10px] border border-line bg-surface p-1">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`relative rounded-md px-3 py-1 text-sm font-medium transition-colors duration-200 ${value === o.value ? 'text-fg' : 'text-fg-3 hover:text-fg'}`}>
          {value === o.value && <motion.span layoutId={`seg-${label}`} className="absolute inset-0 rounded-md bg-surface-3 shadow-sm" />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** "[📅 Oct 16 – Nov 14 | Last 30 days ▾]" — the reference's date-range control, backed by a native select. */
function DateRangePill({ range, onChange }) {
  const [today] = useState(() => new Date());
  const text = range === 'all' ? 'All time' : `${short(daysAgo(Number(range)))} – ${short(today)}`;
  return (
    <div className="flex items-center rounded-[10px] border border-line bg-surface text-sm transition-colors focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
      <span className="flex items-center gap-2 py-2 pl-3 pr-3 text-fg"><CalendarDays className="size-4 text-fg-3" />{text}</span>
      <span className="h-5 w-px bg-line-strong" />
      <label className="relative">
        <span className="sr-only">Date range</span>
        <select value={range} onChange={(e) => onChange(e.target.value)} className="cursor-pointer appearance-none bg-transparent py-2 pl-3 pr-8 text-fg-2 focus:outline-none">
          {RANGES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <svg className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
      </label>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const notify = useToast();
  const lead = isLead(user);
  const [scope, setScope] = useState(lead ? 'team' : 'me');
  const [range, setRange] = useState('30');

  // Date range filters by task creation date; completion trends use completion date.
  const from = range === 'all' ? '' : iso(daysAgo(Number(range)));
  const trendFrom = range === 'all' ? iso(daysAgo(90)) : from;
  const analytics = useAnalytics({ scope, from, to: '', trendFrom, includeWorkload: scope === 'team' });
  const trendLabel = useMemo(() => (range === 'all' ? 'Last 90 days' : RANGES.find((r) => r.value === range).label), [range]);

  // Recent tasks reuse the task hook (optimistic status, CRUD) and refresh analytics on change.
  const recent = useTasks({ pageSize: 5, initialFilters: { assignee: scope === 'me' && lead ? 'me' : '' }, onChange: analytics.reload });
  const [formState, setFormState] = useState({ open: false, task: null });
  const [toDelete, setToDelete] = useState(null);

  const changeScope = (s) => {
    setScope(s);
    recent.setFilter('assignee', s === 'me' && lead ? 'me' : '');
  };

  const o = analytics.overview;
  const statsLoading = analytics.loading && !o;
  const cards = [
    { label: 'Total Tasks', value: o?.total, icon: ListTodo, hint: o && `${o.overdue} overdue` },
    { label: 'To Do', value: o?.todo, icon: ClipboardList, hint: o && `${pct(o.todo, o.total)}% of tasks` },
    { label: 'In Progress', value: o?.inProgress, icon: CircleDot, hint: o && `${pct(o.inProgress, o.total)}% of tasks` },
    { label: 'Completed', value: o?.done, icon: CheckCircle2, hint: o && `${pct(o.done, o.total)}% completion rate` },
    { label: 'Assigned', value: o?.assigned, icon: UserCheck, hint: o && `${pct(o.assigned, o.total)}% have an owner` },
    { label: 'Unassigned', value: o?.unassigned, icon: UserRoundX, hint: o && (o.unassigned ? 'Need an owner' : 'Everything is owned') },
  ];

  const handleSubmit = async (values) => {
    if (formState.task) {
      await recent.updateTask(formState.task.id, values);
      notify('Task updated');
    } else {
      await recent.createTask(values);
      notify('Task created');
    }
  };

  const trends = analytics.trends;
  const openCreate = () => setFormState({ open: true, task: null });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${greeting()}, ${user.name.split(' ')[0]}. ${scope === 'team' ? `Here's how ${user.team.name} is doing.` : "Here's an overview of your work."}`}
        actions={
          <>
            <DateRangePill range={range} onChange={setRange} />
            {lead && <Segmented label="Scope" value={scope} onChange={changeScope} options={[{ value: 'me', label: 'My Tasks' }, { value: 'team', label: 'Entire Team' }]} />}
            <button type="button" className="btn-primary" onClick={openCreate}><Plus className="size-4" />Quick add task</button>
          </>
        }
      />
      {scope === 'me' && <p className="-mt-3 text-xs text-fg-3">Showing tasks assigned to you, plus unassigned tasks you created.</p>}

      {analytics.error ? (
        <ErrorState title="Couldn't load analytics" message={analytics.error} onRetry={analytics.reload} />
      ) : (
        <>
          <motion.section variants={stagger(0.05)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6 xl:gap-4" aria-label="Task statistics">
            {cards.map((c) => <StatsCard key={c.label} {...c} value={c.value ?? '–'} loading={statsLoading} />)}
          </motion.section>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Task status" subtitle="Share of tasks in each status" loading={!analytics.distribution} empty={analytics.distribution?.total === 0}>
              {analytics.distribution && <StatusDonut data={analytics.distribution} />}
            </ChartCard>
            <ChartCard title="Assignment overview" subtitle="Who owns the work — independent of status" loading={!analytics.distribution} empty={analytics.distribution?.total === 0}>
              {analytics.distribution && <AssignmentChart data={analytics.distribution} />}
            </ChartCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            {scope === 'team' && (
              <ChartCard className="lg:col-span-2" title="Team workload" subtitle="Tasks assigned to each member"
                loading={!analytics.workload} empty={analytics.workload?.length === 0} emptyMessage="No team members yet."
                aside={<Link to="/team" className="text-xs font-medium text-accent-text hover:underline">View team</Link>}>
                {analytics.workload && <WorkloadChart data={analytics.workload} />}
              </ChartCard>
            )}
            <ChartCard className={scope === 'team' ? 'lg:col-span-3' : 'lg:col-span-5'} title="Completion trend" subtitle={`Tasks completed per day · ${trendLabel}`}
              loading={!trends} empty={trends?.totalCompleted === 0}
              emptyMessage={trends?.trackingSince ? 'No tasks were completed in this period.' : 'Completion history starts with the next status change — nothing tracked yet.'}
              aside={trends && <span className="tone-done rounded-full px-2.5 py-1 text-xs font-medium tabular-nums">{trends.totalCompleted} completed</span>}>
              {trends && <TrendChart data={trends} />}
            </ChartCard>
          </div>
        </>
      )}

      <section className="space-y-3" aria-label="Recent tasks">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-fg">Recent tasks</h2>
          <Link to="/tasks" className="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline">View all <ArrowRight className="size-4" /></Link>
        </div>
        {recent.error ? (
          <ErrorState compact title="Couldn't load tasks" message={recent.error} onRetry={recent.reload} />
        ) : recent.loading && recent.tasks.length === 0 ? (
          <TaskListSkeleton rows={3} />
        ) : recent.tasks.length === 0 ? (
          <EmptyState compact icon={ClipboardList} title="No tasks yet" message="Create a task to get started."
            action={<button type="button" className="btn-primary" onClick={openCreate}><Plus className="size-4" />Add task</button>} />
        ) : (
          <TaskTable tasks={recent.tasks} pendingIds={recent.pendingIds} currentUserId={user.id} busy={recent.loading}
            onStatusChange={(tk, s) => recent.updateStatus(tk, s).catch((err) => notify(`Status change reverted — ${err.message}`, 'error'))}
            onEdit={(x) => setFormState({ open: true, task: x })} onDelete={setToDelete} />
        )}
      </section>

      {formState.open && (
        <TaskForm key={formState.task?.id ?? 'new'} open task={formState.task} onClose={() => setFormState((s) => ({ ...s, open: false }))}
          onSubmit={handleSubmit} defaults={lead ? {} : { assigned_to: String(user.id) }} />
      )}
      <ConfirmDialog open={Boolean(toDelete)} title="Delete task?" message={toDelete ? `"${toDelete.title}" will be permanently deleted. This can't be undone.` : ''}
        onConfirm={async () => { await recent.deleteTask(toDelete.id); notify('Task deleted'); }} onClose={() => setToDelete(null)} />
    </div>
  );
}
