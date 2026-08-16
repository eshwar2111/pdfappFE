import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { resolveFileUrl } from '@/api/client';
import { documentsApi } from '@/api/endpoints';
import { ChatBubble } from '@/components/ChatBubble';
import { CommentPanel } from '@/components/CommentPanel';
import { PdfViewer } from '@/components/PdfViewer';
import { Alert, Badge, Button, Spinner } from '@/components/ui';
import { describeFailure, isProcessing } from '@/lib/format';
import type { DocumentDetail } from '@/types/api';

interface DocumentWorkspaceProps {
  document: DocumentDetail;
  authToken: string | null;
  /** Where the back arrow leads, or null to hide it (invited guests have no dashboard). */
  backTo: string | null;
  backLabel?: string;
  /** Owner-only controls (Share), rendered at the right of the toolbar. */
  ownerActions?: ReactNode;
  /** Identity chip for invited guests. */
  identity?: ReactNode;
}

/**
 * The reading workspace, shared by the owner and by invited guests.
 *
 * Layout intent: the document is the page. Comments open as a right-hand
 * column when wanted, and chat lives in a floating panel — so neither
 * permanently taxes the reading width.
 */
export function DocumentWorkspace({
  document: doc,
  authToken,
  backTo,
  backLabel = 'Dashboard',
  ownerActions,
  identity,
}: DocumentWorkspaceProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [targetPage, setTargetPage] = useState<number | null>(null);

  // Signed URLs expire, so this is fetched per mount rather than cached.
  useEffect(() => {
    documentsApi
      .file(doc.id)
      .then((file) => setFileUrl(resolveFileUrl(file.url)))
      .catch(() => setFileError('Could not load this PDF. Please refresh the page.'));
  }, [doc.id]);

  const processing = isProcessing(doc.status);

  return (
    <div className="flex min-h-screen flex-col bg-surface-muted lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <header className="shrink-0 border-b border-surface-border bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-3 py-2.5 sm:px-4">
          {backTo && (
            <Link
              to={backTo}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium
                         text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <ArrowLeftIcon />
              <span className="hidden sm:inline">{backLabel}</span>
            </Link>
          )}

          <div className="mx-1 hidden h-5 w-px bg-surface-border sm:block" />

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-sm font-semibold" title={doc.filename}>
              {doc.filename}
            </h1>
            <p className="truncate text-xs text-ink-subtle">
              {doc.page_count ? `${doc.page_count} pages · ` : ''}
              {doc.is_owner ? 'You own this document' : 'Shared with you'}
            </p>
          </div>

          {identity}

          <Button
            variant={isCommentsOpen ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsCommentsOpen((open) => !open)}
            aria-pressed={isCommentsOpen}
          >
            <CommentIcon />
            <span className="hidden sm:inline">Comments</span>
          </Button>

          {ownerActions}
        </div>

        <div className="mx-auto max-w-[1600px] px-3 pb-3 sm:px-4">
          {processing && (
            <div className="rounded-lg bg-brand-50 px-3 py-2">
              <Spinner label="Generating AI insights — this usually takes under a minute." />
            </div>
          )}

          {doc.status === 'FAILED' && <Alert tone="warning">{describeFailure(doc.failure_reason)}</Alert>}

          {doc.status === 'READY' && doc.summary && (
            <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2.5">
              <Badge tone="brand" className="mb-1.5">
                AI summary
              </Badge>
              <p className="text-sm leading-relaxed text-ink">{doc.summary}</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-3 p-3 lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <section className="card min-h-[70vh] flex-1 overflow-hidden lg:min-h-0">
          {fileError ? (
            <div className="p-4">
              <Alert>{fileError}</Alert>
            </div>
          ) : fileUrl ? (
            <PdfViewer fileUrl={fileUrl} targetPage={targetPage} />
          ) : (
            <Spinner label="Loading document" className="p-6" />
          )}
        </section>

        {isCommentsOpen && (
          <aside className="card flex h-[70vh] w-full flex-col overflow-hidden animate-fade-in lg:h-full lg:min-h-0 lg:w-[380px] xl:w-[420px]">
            <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-4 py-3">
              <h2 className="font-display text-sm font-semibold">Comments</h2>
              <button
                type="button"
                onClick={() => setIsCommentsOpen(false)}
                aria-label="Close comments"
                className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-sunken hover:text-ink"
              >
                <CloseIcon />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <CommentPanel documentId={doc.id} permissions={doc.permissions} />
            </div>
          </aside>
        )}
      </main>

      <ChatBubble document={doc} authToken={authToken} onCitationClick={setTargetPage} />
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
