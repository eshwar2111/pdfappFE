import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import DashboardPage from '@/pages/DashboardPage';
import DocumentPage from '@/pages/DocumentPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import NotFoundPage from '@/pages/NotFoundPage';
import SharedDocumentPage from '@/pages/SharedDocumentPage';
import SignupPage from '@/pages/SignupPage';
import type { ReactElement } from 'react';

/**
 * Route guards are a UX convenience only. They decide what to *render*; the
 * server decides what may be *read or written*, and re-checks on every call.
 */
function RequireAuth({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Restoring your session" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuthed({ children }: { children: ReactElement }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignupPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        path="/forgot-password"
        element={
          <RedirectIfAuthed>
            <ForgotPasswordPage />
          </RedirectIfAuthed>
        }
      />
      {/* Not wrapped in RedirectIfAuthed: someone already signed in on this
          browser must still be able to redeem a reset link. */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/documents/:documentId"
        element={
          <RequireAuth>
            <DocumentPage />
          </RequireAuth>
        }
      />

      {/* Public: invited visitors, no account required. */}
      <Route path="/s/:shareToken" element={<SharedDocumentPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
