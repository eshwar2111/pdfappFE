import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { Alert, Button, Input } from '@/components/ui';

const USER_TOKEN_KEY = 'pdfapp.user.token';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirmation.length > 0 && password !== confirmation;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || mismatch) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await authApi.resetPassword(token, password);
      // Redeeming the link proves control of the mailbox, so the API signs the
      // user in directly — a second login step would add friction, not safety.
      localStorage.setItem(USER_TOKEN_KEY, result.access_token);
      // Full reload so AuthProvider re-reads the stored token on boot.
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset your password.');
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-sm space-y-3 p-6 text-center">
          <h1 className="font-display text-base font-semibold">Invalid reset link</h1>
          <p className="text-sm text-ink-muted">
            This link is missing its token. Request a new one to continue.
          </p>
          <Button variant="secondary" onClick={() => navigate('/forgot-password')}>
            Request a new link
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-xl font-bold">Choose a new password</h1>
          <p className="mt-1 text-sm text-ink-muted">You&rsquo;ll be signed in afterwards.</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6">
          {error && <Alert>{error}</Alert>}

          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            required
            autoFocus
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters, including a letter and a number."
          />

          <Input
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            error={mismatch ? 'Passwords do not match.' : null}
          />

          <Button
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            disabled={mismatch || password.length < 8}
          >
            Reset password
          </Button>

          <p className="text-center text-sm text-ink-muted">
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
