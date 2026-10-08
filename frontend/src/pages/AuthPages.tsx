import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../api';
import { useAuth } from '../AuthContext';

interface AuthFormProps {
  mode: 'login' | 'register';
}

function AuthForm({ mode }: AuthFormProps) {
  const { login, register } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await (isRegister ? register : login)(username, password);
      // On success the router redirects to the feed (GuestOnly guard).
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fields);
      } else {
        setError('Could not reach the server. Please try again.');
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h1>{isRegister ? 'Create your account' : 'Sign in to Chirp'}</h1>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={Boolean(fieldErrors.username)}
          required
          autoFocus
        />
        {isRegister && <small className="muted">3–30 letters, digits or underscores.</small>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
          required
        />
        {isRegister && <small className="muted">At least 8 characters.</small>}

        <button type="submit" className="btn btn-block" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </button>

        <p className="center muted">
          {isRegister ? (
            <>
              Already have an account? <Link to="/login">Sign in</Link>
            </>
          ) : (
            <>
              New to Chirp? <Link to="/register">Create an account</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function RegisterPage() {
  return <AuthForm mode="register" />;
}
