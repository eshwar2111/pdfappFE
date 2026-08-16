import { useEffect, useState } from 'react';

import { ChatPanel } from '@/components/ChatPanel';
import type { DocumentDetail } from '@/types/api';

interface ChatBubbleProps {
  document: DocumentDetail;
  authToken: string | null;
  onCitationClick: (page: number) => void;
}

/**
 * Floating assistant.
 *
 * Chat lives in an overlay rather than a permanent column so the document gets
 * the full width by default — reading is the primary task, asking is the
 * occasional one. The panel keeps its mounted state while open, so a
 * conversation is not reloaded every time it is toggled.
 */
export function ChatBubble({ document: doc, authToken, onCitationClick }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!doc.permissions.includes('CHAT')) return null;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-0 top-0 z-40 flex flex-col bg-white shadow-float
                     animate-slide-up sm:inset-x-auto sm:bottom-24 sm:right-5 sm:top-auto
                     sm:h-[min(620px,calc(100vh-8rem))] sm:w-[400px] sm:rounded-2xl
                     sm:border sm:border-surface-border lg:w-[420px]"
          role="dialog"
          aria-label="AI chat"
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-surface-border px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <SparkIcon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm font-semibold">Ask this document</p>
              <p className="truncate text-xs text-ink-subtle">{doc.filename}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1.5 text-ink-subtle hover:bg-surface-sunken hover:text-ink"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <ChatPanel document={doc} authToken={authToken} onCitationClick={onCitationClick} />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close AI chat' : 'Open AI chat'}
        aria-expanded={isOpen}
        className="fixed bottom-5 right-5 z-50 flex h-14 items-center gap-2 rounded-full bg-brand-600 px-5
                   text-sm font-medium text-white shadow-float transition-all
                   hover:bg-brand-700 active:scale-95"
      >
        {isOpen ? <CloseIcon /> : <SparkIcon />}
        <span className="hidden sm:inline">{isOpen ? 'Close' : 'Ask AI'}</span>
      </button>
    </>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
