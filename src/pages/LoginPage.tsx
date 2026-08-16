import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { Alert, Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">PDF Intelligence</h1>
          <p className="mt-1 text-sm text-ink-muted">Sign in to your documents</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {error && <Alert>{error}</Alert>}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div>
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="mt-1.5 text-right">
              <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Sign in
          </Button>

          <p className="text-center text-sm text-ink-muted">
            No account?{' '}
            <Link to="/signup" className="font-medium text-brand-600 hover:underline">
              Create one
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
