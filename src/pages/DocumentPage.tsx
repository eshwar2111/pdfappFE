import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { documentsApi } from '@/api/endpoints';
import { DocumentWorkspace } from '@/components/DocumentWorkspace';
import { ShareDialog } from '@/components/ShareDialog';
import { Alert, Button, ConfirmDialog, Spinner } from '@/components/ui';
import { isProcessing } from '@/lib/format';
import type { DocumentDetail } from '@/types/api';

const POLL_INTERVAL_MS = 3000;
const USER_TOKEN_KEY = 'pdfapp.user.token';

/** The owner's view of a document. */
export default function DocumentPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!documentId) return;
    try {
      setDocument(await documentsApi.get(documentId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this document.');
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll until the AI pipeline reaches a terminal state, then stop.
  useEffect(() => {
    if (!document || !isProcessing(document.status)) return undefined;
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [document, load]);

  const confirmDelete = useCallback(async () => {
    if (!document) return;
    setIsDeleting(true);
    try {
      await documentsApi.remove(document.id);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete this document.');
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }, [document, navigate]);

  if (error && !document) {
    return (
      <div className="mx-auto max-w-md space-y-3 p-6">
        <Alert>{error}</Alert>
        <Link to="/dashboard" className="text-sm font-medium text-brand-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading document" />
      </div>
    );
  }

  const canManage = document.permissions.includes('MANAGE');

  return (
    <>
      <DocumentWorkspace
        document={document}
        authToken={localStorage.getItem(USER_TOKEN_KEY)}
        backTo="/dashboard"
        ownerActions={
          canManage && (
            <>
              <Button size="sm" onClick={() => setIsShareOpen(true)}>
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                aria-label="Delete document"
                title="Delete document"
                className="text-ink-subtle hover:bg-clay-50 hover:text-clay-600"
              >
                <TrashIcon />
              </Button>
            </>
          )
        }
      />

      <ShareDialog documentId={document.id} isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete this document?"
        isBusy={isDeleting}
        onCancel={() => setIsDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        description={
          <>
            <p className="mb-2">
              <span className="font-medium text-ink">{document.filename}</span> will be permanently
              removed, along with its summary, search index, comments, chat history and all share
              links. Anyone holding a link will lose access immediately.
            </p>
            <p>This cannot be undone.</p>
          </>
        }
      />
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
