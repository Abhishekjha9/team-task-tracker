import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal';
import FormError from './ui/FormError';
import { getErrorMessage } from '../services/api';

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (busy) return;
    setError('');
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={title} size="sm">
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--danger)_14%,transparent)]">
          <AlertTriangle className="size-4 text-danger-text" />
        </div>
        <p className="pt-1.5 text-sm text-fg-2">{message}</p>
      </div>
      <FormError message={error} className="mt-3" />
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={close} disabled={busy}>Cancel</button>
        <button type="button" className="btn-danger" onClick={confirm} disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
