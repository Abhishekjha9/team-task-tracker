import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import Select from './ui/Select';
import FormError, { FieldError } from './ui/FormError';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/taskMeta';
import { isLead } from '../utils/permissions';
import { getErrorMessage, getFieldErrors } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTeam } from '../context/TeamContext';

const toForm = (task, defaults) =>
  task
    ? {
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || '',
        assigned_to: task.assigned_to ? String(task.assigned_to) : '',
      }
    : { title: '', description: '', status: 'todo', priority: 'medium', due_date: '', assigned_to: '', ...defaults };

const roleLabel = (r) => r.charAt(0).toUpperCase() + r.slice(1);

/** Create/edit form. Mount with a `key` per task so state resets between opens. */
export default function TaskForm({ open, task, defaults, onClose, onSubmit }) {
  const { user } = useAuth();
  const { members } = useTeam();
  const isEdit = Boolean(task);
  const [values, setValues] = useState(() => toForm(task, defaults));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Leads may assign anyone in the team; members may only pick themselves (enforced by the API too).
  const canAssign = isEdit ? task.permissions?.canAssign !== false : true;
  const assignable = isLead(user) ? members : members.filter((m) => m.id === user.id);
  const currentAssigneeMissing = task?.assignee && !assignable.some((m) => m.id === task.assignee.id);

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = () => {
    const er = {};
    if (!values.title.trim()) er.title = 'Title is required';
    else if (values.title.trim().length > 200) er.title = 'Title must be at most 200 characters';
    return er;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const payload = {
        title: values.title.trim(),
        description: values.description.trim() || null,
        status: values.status,
        priority: values.priority,
        due_date: values.due_date || null,
      };
      if (canAssign) payload.assigned_to = values.assigned_to ? Number(values.assigned_to) : null;
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not save the task.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      description={isEdit ? 'Update the details of this task.' : 'Add a task and assign it to a teammate.'}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={formError} />

        <div>
          <label htmlFor="title" className="label">Title <span className="text-danger-text">*</span></label>
          <input id="title" className="input" value={values.title} onChange={set('title')} placeholder="e.g. Redesign the pricing page" autoFocus maxLength={200} aria-invalid={Boolean(errors.title)} />
          <FieldError message={errors.title} />
        </div>

        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" rows={3} className="input resize-none" value={values.description} onChange={set('description')} placeholder="Add more context (optional)" />
        </div>

        <div>
          <label htmlFor="assigned_to" className="label">Assign to</label>
          <Select id="assigned_to" value={values.assigned_to} onChange={set('assigned_to')} disabled={!canAssign} aria-describedby="assign-help">
            <option value="">Unassigned</option>
            {currentAssigneeMissing && <option value={task.assignee.id}>{task.assignee.name} · {task.assignee.email}</option>}
            {assignable.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.id === user.id ? ' (you)' : ''} · {m.email} · {roleLabel(m.role)}
              </option>
            ))}
          </Select>
          <p id="assign-help" className="mt-1 text-xs text-fg-3">
            {!canAssign ? 'Only the task creator or a manager can change the assignee.' : !isLead(user) ? 'Members can assign tasks to themselves. Ask a manager to assign others.' : 'The assignee is responsible for completing this task.'}
          </p>
          <FieldError message={errors.assigned_to} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="status" className="label">Status</label>
            <Select id="status" value={values.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="priority" className="label">Priority</label>
            <Select id="priority" value={values.priority} onChange={set('priority')}>
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </div>
          <div>
            <label htmlFor="due_date" className="label">Due date</label>
            <input id="due_date" type="date" className="input" value={values.due_date} onChange={set('due_date')} />
            <FieldError message={errors.due_date} />
          </div>
        </div>

        {isEdit && task.creator && (
          <p className="text-xs text-fg-3">
            Created by <span className="font-medium text-fg-2">{task.creator.id === user.id ? 'you' : task.creator.name}</span> on{' '}
            {new Date(task.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
