import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Alert, Button, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setIsSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-xl font-bold">Reset your password</h1>
          <p className="mt-1 text-sm text-ink-muted">
            We&rsquo;ll email you a link to choose a new one.
          </p>
        </div>

        {isSent ? (
          // Deliberately does not confirm whether the address is registered —
          // the same message either way, matching the API's behaviour.
          <div className="card space-y-3 p-6 text-center">
            <p className="text-sm text-ink">
              If an account exists for <span className="font-medium">{email}</span>, a reset link is
              on its way.
            </p>
            <p className="text-xs text-ink-subtle">
              The link expires in 30 minutes and can be used once. Check your spam folder if it
              doesn&rsquo;t arrive.
            </p>
            <Link to="/login" className="inline-block text-sm font-medium text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="card space-y-4 p-6">
            {error && <Alert>{error}</Alert>}

            <Input
              label="Email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Send reset link
            </Button>

            <p className="text-center text-sm text-ink-muted">
              Remembered it?{' '}
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
