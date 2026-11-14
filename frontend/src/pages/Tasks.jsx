import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, Plus, SearchX } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TaskFilters from '../components/TaskFilters';
import TaskTable from '../components/TaskTable';
import TaskForm from '../components/TaskForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Pagination from '../components/Pagination';
import { EmptyState, ErrorState, TaskListSkeleton } from '../components/States';
import { useTasks } from '../hooks/useTasks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isLead } from '../utils/permissions';

/** Full task list with server-side search, filters (status, priority, assignee, assignment) and pagination. */
export default function Tasks() {
  const { user } = useAuth();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') || '';
  // Leads see the whole team, so "My Tasks" starts filtered to their own assignments.
  const t = useTasks({ initialFilters: { assignee: isLead(user) && !urlQuery ? 'me' : '' }, initialSearch: urlQuery });
  const [formState, setFormState] = useState({ open: false, task: null });
  const [toDelete, setToDelete] = useState(null);

  // The top-bar search navigates here with ?q=…; apply it, then drop it from the URL.
  const { setSearchInput } = t;
  useEffect(() => {
    if (!urlQuery) return;
    setSearchInput(urlQuery);
    setParams({}, { replace: true });
  }, [urlQuery, setSearchInput, setParams]);

  const openCreate = () => setFormState({ open: true, task: null });
  const closeForm = () => setFormState((s) => ({ ...s, open: false }));

  const handleSubmit = async (values) => {
    if (formState.task) {
      await t.updateTask(formState.task.id, values);
      notify('Task updated');
    } else {
      await t.createTask(values);
      notify('Task created');
    }
  };

  const handleStatusChange = (task, status) => {
    t.updateStatus(task, status).catch((err) => notify(`Status change reverted — ${err.message}`, 'error'));
  };

  const f = t.filters;
  const hasFilters = Boolean(f.search || f.status || f.priority || f.assignee || f.assignment);

  let content;
  if (t.error) {
    content = <ErrorState title="Couldn't load tasks" message={t.error} onRetry={t.reload} />;
  } else if (t.loading && t.tasks.length === 0) {
    content = <TaskListSkeleton rows={6} />;
  } else if (t.tasks.length === 0) {
    content = hasFilters ? (
      <EmptyState icon={SearchX} title="No matching tasks" message="No tasks match your current search or filters."
        action={<button type="button" className="btn-secondary" onClick={t.clearFilters}>Clear filters</button>} />
    ) : (
      <EmptyState icon={ClipboardList} title="No tasks yet" message="Create your first task to start tracking your work."
        action={<button type="button" className="btn-primary" onClick={openCreate}><Plus className="size-4" />Add task</button>} />
    );
  } else {
    content = (
      <TaskTable tasks={t.tasks} pendingIds={t.pendingIds} currentUserId={user.id} busy={t.loading}
        onStatusChange={handleStatusChange} onEdit={(x) => setFormState({ open: true, task: x })} onDelete={setToDelete} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        description={isLead(user) ? 'Every task in your team. Filter by assignee to focus.' : 'Tasks assigned to you or created by you.'}
        actions={
          <>
            {t.loading && t.tasks.length > 0 && <Loader2 className="size-4 animate-spin text-fg-3" aria-label="Loading" />}
            <button type="button" className="btn-primary" onClick={openCreate}><Plus className="size-4" />Add task</button>
          </>
        }
      />

      <section className="space-y-4" aria-label="Tasks">
        <TaskFilters searchInput={t.searchInput} onSearchChange={t.setSearchInput} filters={f} onFilterChange={t.setFilter} onClear={t.clearFilters} />
        {content}
        {!t.error && t.totalTasks > 0 && (
          <Pagination currentPage={t.currentPage} totalPages={t.totalPages} totalTasks={t.totalTasks} pageSize={f.limit}
            onPageChange={(p) => t.setFilter('page', p)} disabled={t.loading} />
        )}
      </section>

      {formState.open && (
        <TaskForm key={formState.task?.id ?? 'new'} open task={formState.task} onClose={closeForm} onSubmit={handleSubmit}
          defaults={isLead(user) ? {} : { assigned_to: String(user.id) }} />
      )}
      <ConfirmDialog open={Boolean(toDelete)} title="Delete task?" message={toDelete ? `"${toDelete.title}" will be permanently deleted. This can't be undone.` : ''}
        onConfirm={async () => { await t.deleteTask(toDelete.id); notify('Task deleted'); }} onClose={() => setToDelete(null)} />
    </div>
  );
}
