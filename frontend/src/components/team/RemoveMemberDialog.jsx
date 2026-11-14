import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '../Modal';
import Select from '../ui/Select';
import FormError from '../ui/FormError';
import { teamService } from '../../services/teamService';
import { getErrorMessage } from '../../services/api';

/** Removal never deletes tasks: the member's assigned tasks are reassigned or left unassigned. */
export default function RemoveMemberDialog({ member, members, onClose, onRemoved }) {
  const [reassignTo, setReassignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const openTasks = member.stats ? member.stats.total : null;
  const targets = members.filter((m) => m.id !== member.id);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      onRemoved(await teamService.removeMember(member.id, reassignTo ? Number(reassignTo) : null));
    } catch (err) {
      setError(getErrorMessage(err, 'Could not remove the member.'));
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={busy ? () => {} : onClose} title={`Remove ${member.name}?`} size="sm">
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]"><AlertTriangle className="size-4 text-danger-text" /></div>
        <p className="pt-1 text-sm text-fg-2">They lose access to this team immediately. Their account and the tasks they created are kept.</p>
      </div>
      <div className="mt-4">
        <label htmlFor="reassign" className="label">{openTasks !== null ? `Their ${openTasks} assigned task${openTasks === 1 ? '' : 's'} will be` : 'Their assigned tasks will be'}</label>
        <Select id="reassign" value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
          <option value="">Left unassigned</option>
          {targets.map((m) => <option key={m.id} value={m.id}>Reassigned to {m.name}</option>)}
        </Select>
      </div>
      <FormError message={error} className="mt-3" />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
        <button type="button" className="btn-danger" onClick={confirm} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Remove member</button>
      </div>
    </Modal>
  );
}
