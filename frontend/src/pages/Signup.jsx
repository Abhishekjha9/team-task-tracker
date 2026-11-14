import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import FormError, { FieldError } from '../components/ui/FormError';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, getFieldErrors } from '../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'Name is required';
  if (!EMAIL_RE.test(email.trim())) errors.email = 'Enter a valid email address';
  if (password.length < 6) errors.password = 'Password must be at least 6 characters';
  return errors;
}

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', teamName: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = validate(form);
    setErrors(er);
    if (Object.keys(er).length) return;

    setSubmitting(true);
    setError('');
    try {
      await signup(form);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      setError(getErrorMessage(err, 'Sign up failed.'));
      setSubmitting(false);
    }
  };

  const field = (id, label, props) => (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} className="input" value={form[id]} onChange={set(id)} aria-invalid={Boolean(errors[id])} {...props} />
      <FieldError message={errors[id]} />
    </div>
  );

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start a team and organize work in minutes."
      footer={<>Already have an account? <Link to="/login" className="font-medium text-accent-text hover:underline">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={error} />
        {field('name', 'Full name', { autoComplete: 'name', placeholder: 'Ada Lovelace', autoFocus: true })}
        {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'you@company.com' })}
        {field('password', 'Password', { type: 'password', autoComplete: 'new-password', placeholder: 'At least 6 characters' })}
        {field('teamName', 'Team name (optional)', { autoComplete: 'organization', placeholder: form.name.trim() ? `${form.name.trim().split(' ')[0]}'s Team` : 'Acme Product Team' })}
        <p className="-mt-2 text-xs text-fg-3">You'll be the admin of a new team. Invite teammates from the Team page.</p>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Create account
        </button>
      </form>
    </AuthLayout>
  );
}
