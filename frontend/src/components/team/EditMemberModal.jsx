import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../Modal';
import Select from '../ui/Select';
import FormError, { FieldError } from '../ui/FormError';
import { teamService } from '../../services/teamService';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import { assignableRoles } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';

export default function EditMemberModal({ member, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: member.name, email: member.email, role: member.role });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isSelf = member.id === user.id;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const changes = Object.fromEntries(Object.entries(form).filter(([k, v]) => v.trim?.() !== member[k] && v !== member[k]));
    if (!Object.keys(changes).length) return onClose();
    setSaving(true);
    setError('');
    setErrors({});
    try {
      const updated = await teamService.updateMember(member.id, changes);
      onSaved(updated);
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Could not update the member.'));
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={saving ? () => {} : onClose} title="Edit member" description={`Update ${member.name}'s details and role.`}>
      <form onSubmit={save} noValidate className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="e-name" className="label">Full name</label>
            <input id="e-name" className="input" value={form.name} onChange={set('name')} autoFocus />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label htmlFor="e-email" className="label">Email</label>
            <input id="e-email" type="email" className="input" value={form.email} onChange={set('email')} />
            <FieldError message={errors.email} />
          </div>
        </div>
        <div>
          <label htmlFor="e-role" className="label">Role</label>
          <Select id="e-role" value={form.role} onChange={set('role')} disabled={isSelf && user.role !== 'admin'}>
            {assignableRoles(user).map((r) => <option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}
          </Select>
          <FieldError message={errors.role} />
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving && <Loader2 className="size-4 animate-spin" />}Save changes</button>
        </div>
      </form>
    </Modal>
  );
}
