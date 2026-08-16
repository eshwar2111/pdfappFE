import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import { documentsApi } from '@/api/endpoints';
import { DocumentCard } from '@/components/DocumentCard';
import { UploadZone } from '@/components/UploadZone';
import { Alert, Button, ConfirmDialog, EmptyState, Input, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { isProcessing } from '@/lib/format';
import type { DocumentSearchResult, DocumentSummary } from '@/types/api';

const POLL_INTERVAL_MS = 3000;

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [searchResults, setSearchResults] = useState<DocumentSearchResult[] | null>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const page = await documentsApi.list({ limit: 50 });
      setDocuments(page.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load your documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll only while something is processing; no timers on an idle dashboard.
  const hasPending = documents.some((doc) => isProcessing(doc.status));
  useEffect(() => {
    if (!hasPending) return undefined;
    const timer = setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPending, load]);

  const debounceRef = useRef<number>();
  useEffect(() => {
    const trimmed = query.trim();
    window.clearTimeout(debounceRef.current);

    if (!trimmed) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = window.setTimeout(() => {
      documentsApi
        .search(trimmed)
        .then((results) => {
          setSearchResults(results);
          setError(null);
        })
        .catch((err: unknown) => {
          // Never swallow this into an empty result set: a failing search and a
          // search with no matches look identical to the user, and the first is
          // a bug while the second is not.
          setSearchResults(null);
          setError(
            err instanceof ApiError
              ? `Search failed: ${err.message}`
              : 'Search failed. Please try again.',
          );
        })
        .finally(() => setIsSearching(false));
    }, 350);

    return () => window.clearTimeout(debounceRef.current);
  }, [query]);

  const onUploaded = useCallback((document: DocumentSummary) => {
    setDocuments((prev) => [document, ...prev]);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await documentsApi.remove(pendingDelete.id);
      // Drop it from both lists so the UI settles without waiting for a refetch.
      setDocuments((prev) => prev.filter((doc) => doc.id !== pendingDelete.id));
      setSearchResults((prev) =>
        prev ? prev.filter((result) => result.document.id !== pendingDelete.id) : prev,
      );
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete that document.');
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDelete]);

  const visible =
    searchResults ?? documents.map((document) => ({ document, excerpt: null, relevance: null }));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-surface-border bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <LogoMark />
            <h1 className="font-display text-base font-bold tracking-tight">PDF Intelligence</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <UploadZone onUploaded={onUploaded} />

        <Input
          label="Search"
          placeholder="Search by filename, or describe what the document is about…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          hint="Semantic search finds documents by content — try “employment contract”."
        />

        {error && <Alert>{error}</Alert>}

        {isLoading ? (
          <Spinner label="Loading your documents" />
        ) : visible.length === 0 ? (
          query.trim() ? (
            <EmptyState
              title="No matches"
              description={`Nothing matched “${query.trim()}”. Try different wording, or clear the search.`}
              action={
                <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <EmptyState
              title="No documents yet"
              description="Upload your first PDF above. It will be summarised automatically, and you can then ask questions about it."
            />
          )
        ) : (
          <>
            {isSearching && <Spinner label="Searching" />}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((result) => (
                <DocumentCard
                  key={result.document.id}
                  document={result.document}
                  excerpt={result.excerpt}
                  relevance={result.relevance}
                  onDelete={setPendingDelete}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete this document?"
        isBusy={isDeleting}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
        description={
          <>
            <p className="mb-2">
              <span className="font-medium text-ink">{pendingDelete?.filename}</span> will be
              permanently removed.
            </p>
            <p>This also deletes, for everyone:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>the stored PDF file</li>
              <li>its AI summary and search index</li>
              <li>all comments and replies</li>
              <li>every chat conversation</li>
              <li>all share links — anyone holding one will lose access immediately</li>
            </ul>
            <p className="mt-2">This cannot be undone.</p>
          </>
        }
      />
    </div>
  );
}

function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
    </span>
  );
}
