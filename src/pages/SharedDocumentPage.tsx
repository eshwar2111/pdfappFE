import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { documentsApi, sharesApi } from '@/api/endpoints';
import { DocumentWorkspace } from '@/components/DocumentWorkspace';
import { Alert, Badge, Button, Input, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { isProcessing } from '@/lib/format';
import type { DocumentDetail, SharePreview } from '@/types/api';

const POLL_INTERVAL_MS = 3000;

/**
 * The invited visitor's entry point. No account required.
 *
 * Flow: preview the link → give a display name → receive a guest token scoped
 * to this one document → use the same workspace the owner sees, limited to the
 * permissions the link grants.
 */
export default function SharedDocumentPage() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const { activateGuest, saveGuestSession, getGuestSession } = useAuth();

  const [preview, setPreview] = useState<SharePreview | null>(null);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [guestName, setGuestName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Tell the API client to send this link's guest token rather than any
  // signed-in user's token, so a logged-in user opening someone else's link
  // acts as a guest on it.
  useEffect(() => {
    if (shareToken) activateGuest(shareToken);
    return () => activateGuest(null);
  }, [shareToken, activateGuest]);

  const loadDocument = useCallback(async (documentId: string) => {
    try {
      setDocument(await documentsApi.get(documentId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open this document.');
    }
  }, []);

  // On mount: fetch the preview and, if this browser already has a session for
  // this link, restore it instead of asking for a name again.
  useEffect(() => {
    if (!shareToken) return;

    sharesApi
      .preview(shareToken)
      .then(async (result) => {
        setPreview(result);
        const existing = getGuestSession(shareToken);
        if (existing) {
          setGuestName(existing.displayName);
          await loadDocument(result.document_id);
        }
      })
      .catch((err: unknown) =>
        setError(
          err instanceof ApiError ? err.message : 'This share link is invalid or has expired.',
        ),
      )
      .finally(() => setIsLoading(false));
  }, [shareToken, getGuestSession, loadDocument]);

  useEffect(() => {
    if (!document || !isProcessing(document.status)) return undefined;
    const timer = setInterval(() => void loadDocument(document.id), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [document, loadDocument]);

  const join = async (event: FormEvent) => {
    event.preventDefault();
    if (!shareToken || !preview) return;

    setIsJoining(true);
    setError(null);
    try {
      const session = await sharesApi.startSession(shareToken, displayName.trim());
      saveGuestSession(shareToken, session);
      setGuestName(session.display_name);
      await loadDocument(session.document_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the document.');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Opening shared document" />
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Alert>{error}</Alert>
      </div>
    );
  }

  // Identity gate: collected once, then persisted server-side as a guest session.
  if (!document || !guestName) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <form onSubmit={join} className="card w-full max-w-sm space-y-4 p-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-subtle">Shared document</p>
            <h1 className="mt-1 truncate font-semibold" title={preview?.filename}>
              {preview?.filename}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">Shared by {preview?.owner_name}</p>
          </div>

          <div className="flex flex-wrap gap-1">
            {preview?.permissions.map((permission) => (
              <Badge key={permission} tone="brand">
                {permission === 'VIEW' ? 'View' : permission === 'COMMENT' ? 'Comment' : 'AI chat'}
              </Badge>
            ))}
          </div>

          {error && <Alert>{error}</Alert>}

          <Input
            label="Your name"
            required
            maxLength={80}
            autoFocus
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            hint="Shown alongside your comments. No account needed."
          />

          <Button type="submit" className="w-full" isLoading={isJoining} disabled={!displayName.trim()}>
            Open document
          </Button>
        </form>
      </div>
    );
  }

  return (
    <DocumentWorkspace
      document={document}
      authToken={shareToken ? (getGuestSession(shareToken)?.token ?? null) : null}
      // Guests have no dashboard to go back to — the share link is their whole
      // world, so a back arrow would lead somewhere they cannot reach.
      backTo={null}
      identity={
        <div className="mr-1 flex items-center gap-1.5">
          <Badge>Guest</Badge>
          <span className="hidden text-sm text-ink-muted sm:inline">{guestName}</span>
        </div>
      }
    />
  );
}
