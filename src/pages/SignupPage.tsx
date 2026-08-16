import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { Alert, Button, Input } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await signup(name, email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-ink-muted">Upload PDFs and get AI summaries in seconds</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {error && <Alert>{error}</Alert>}

          <Input
            label="Name"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters, including a letter and a number."
          />

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Create account
          </Button>

          <p className="text-center text-sm text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
