import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2 } from 'lucide-react';
import Modal from '../Modal';
import FormError, { FieldError } from '../ui/FormError';
import { teamService } from '../../services/teamService';
import { getErrorMessage, getFieldErrors } from '../../services/api';
import { assignableRoles } from '../../utils/permissions';
import { useAuth } from '../../context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddMemberModal({ open, onClose, onAdded }) {
  const { user } = useAuth();
  const [values, setValues] = useState({ name: '', email: '', role: 'member', password: '' });
  const [generate, setGenerate] = useState(true);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null); // { member, temporaryPassword }
  const [copied, setCopied] = useState(false);

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!values.name.trim()) er.name = 'Name is required';
    if (!EMAIL_RE.test(values.email.trim())) er.email = 'Enter a valid email address';
    if (!generate && values.password.length < 6) er.password = 'Password must be at least 6 characters';
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    setFormError('');
    try {
      const res = await teamService.addMember({
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        ...(generate ? {} : { password: values.password }),
      });
      onAdded(res.member);
      if (res.temporaryPassword) setCreated(res);
      else onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err, 'Could not add the member.'));
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (created) {
    return (
      <Modal open={open} onClose={onClose} title="Member added" description={`${created.member.name} can now sign in and be assigned tasks.`}>
        <div className="rounded-xl border border-[color-mix(in_oklab,var(--progress)_35%,transparent)] bg-[color-mix(in_oklab,var(--progress)_10%,transparent)] p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-warning-text"><KeyRound className="size-4" />Temporary password</p>
          <p className="mt-1 text-xs text-fg-2">Share it securely. It is shown only once and is not stored in plain text.</p>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-[10px] border border-line-strong bg-[var(--input)] px-3 py-2 font-mono text-sm text-fg">{created.temporaryPassword}</code>
            <button type="button" className="btn-secondary" onClick={copy}>
              {copied ? <Check className="size-4 text-success-text" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="mt-3 text-xs text-fg-2">Sign-in email: <span className="font-medium text-fg">{created.member.email}</span></p>
        </div>
        <div className="mt-5 flex justify-end"><button type="button" className="btn-primary" onClick={onClose}>Done</button></div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title="Add team member" description="Create an account and add it to your team.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <div>
          <label htmlFor="m-name" className="label">Full name</label>
          <input id="m-name" className="input" value={values.name} onChange={set('name')} autoFocus placeholder="Jordan Lee" aria-invalid={Boolean(errors.name)} />
          <FieldError message={errors.name} />
        </div>
        <div>
          <label htmlFor="m-email" className="label">Email</label>
          <input id="m-email" type="email" className="input" value={values.email} onChange={set('email')} placeholder="jordan@company.com" aria-invalid={Boolean(errors.email)} />
          <FieldError message={errors.email} />
        </div>
        <fieldset>
          <legend className="label">Role</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {assignableRoles(user).map((r) => (
              <label key={r.value} className={`cursor-pointer rounded-xl border p-3 text-sm transition-all duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent/25 ${values.role === r.value ? 'border-accent bg-accent-soft ring-1 ring-accent' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="role" value={r.value} checked={values.role === r.value} onChange={set('role')} className="sr-only" />
                <span className="block font-medium text-fg">{r.label}</span>
                <span className="mt-0.5 block text-xs text-fg-3">{r.description}</span>
              </label>
            ))}
          </div>
          <FieldError message={errors.role} />
        </fieldset>
        <div>
          <label className="flex items-center gap-2 text-sm text-fg-2">
            <input type="checkbox" className="size-4 rounded border-line-strong accent-[var(--accent)]" checked={generate} onChange={(e) => setGenerate(e.target.checked)} />
            Generate a temporary password
          </label>
          {!generate && (
            <div className="mt-2">
              <label htmlFor="m-password" className="sr-only">Password</label>
              <input id="m-password" type="password" autoComplete="new-password" className="input" value={values.password} onChange={set('password')} placeholder="At least 6 characters" aria-invalid={Boolean(errors.password)} />
              <FieldError message={errors.password} />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Add member
          </button>
        </div>
      </form>
    </Modal>
  );
}
