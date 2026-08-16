import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-ink-muted">That link does not lead anywhere.</p>
      <Link to="/dashboard" className="mt-2 text-sm font-medium text-brand-600 hover:underline">
        Go to dashboard
      </Link>
    </div>
  );
}
