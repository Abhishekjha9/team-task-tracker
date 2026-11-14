import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';
import FormError from '../components/ui/FormError';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setError('Please enter your email and password.');
    setSubmitting(true);
    setError('');
    try {
      await login(form);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Login failed.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your tasks."
      footer={<>Don&apos;t have an account? <Link to="/signup" className="font-medium text-accent-text hover:underline">Sign up</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FormError message={error} />
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" type="email" autoComplete="email" className="input" value={form.email} onChange={set('email')} placeholder="you@company.com" autoFocus />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="input" value={form.password} onChange={set('password')} placeholder="••••••••" />
        </div>
        <button type="submit" className="btn-primary w-full py-2.5" disabled={submitting}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>
      </form>
    </AuthLayout>
  );
}
