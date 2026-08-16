import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import { chatApi } from '@/api/endpoints';
import { Alert, Badge, Button, Spinner, TextArea } from '@/components/ui';
import { RichText, hasInlineCitations } from '@/lib/markdown';
import type { ChatMessage, Citation, DocumentDetail } from '@/types/api';

interface ChatPanelProps {
  document: DocumentDetail;
  authToken: string | null;
  onCitationClick: (page: number) => void;
}

/** A streaming turn that has not been persisted yet. */
interface PendingAnswer {
  text: string;
  citations: Citation[];
}

export function ChatPanel({ document: doc, authToken, onCitationClick }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<PendingAnswer | null>(null);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAnswering, setIsAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isReady = doc.status === 'READY';

  useEffect(() => {
    chatApi
      .history(doc.id)
      .then((conversation) => setMessages(conversation.messages))
      .catch(() => setMessages([]))
      .finally(() => setIsLoading(false));
  }, [doc.id]);

  // Keep the newest turn in view as tokens arrive.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  const ask = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || isAnswering) return;

    setQuestion('');
    setError(null);
    setIsAnswering(true);

    // Optimistically show the question so the panel responds immediately.
    const optimistic: ChatMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: trimmed,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setPending({ text: '', citations: [] });

    try {
      // EventSource cannot POST or set headers, so the SSE stream is read from
      // a fetch response body instead.
      const response = await fetch(chatApi.streamUrl(doc.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ question: trimmed }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new ApiError(
          body?.message ?? 'The assistant could not answer right now.',
          body?.error_code ?? 'chat_failed',
          response.status,
          null,
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let answer = '';
      let citations: Citation[] = [];

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE frames are separated by a blank line; a partial frame stays in
        // the buffer until the rest of it arrives.
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const eventLine = frame.split('\n').find((line) => line.startsWith('event: '));
          const dataLine = frame.split('\n').find((line) => line.startsWith('data: '));
          if (!eventLine || !dataLine) continue;

          const event = eventLine.slice(7).trim();
          const payload = JSON.parse(dataLine.slice(6)) as Record<string, unknown>;

          if (event === 'citations') {
            citations = (payload.citations as Citation[]) ?? [];
            setPending({ text: answer, citations });
          } else if (event === 'delta') {
            answer += (payload.text as string) ?? '';
            setPending({ text: answer, citations });
          } else if (event === 'error') {
            // The response is already a 200 with headers sent, so failures
            // arrive in-band. Surface the server's message rather than a
            // generic one — it distinguishes "model busy" from "quota reached".
            throw new ApiError(
              (payload.message as string) ?? 'The assistant could not answer right now.',
              (payload.error_code as string) ?? 'chat_failed',
              200,
              null,
            );
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `answer-${Date.now()}`,
          role: 'assistant',
          content: answer,
          citations,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The assistant could not answer right now.');
      // Drop the optimistic question so the transcript matches the server.
      setMessages((prev) => prev.filter((message) => message.id !== optimistic.id));
    } finally {
      setPending(null);
      setIsAnswering(false);
    }
  }, [authToken, doc.id, isAnswering, question]);

  if (isLoading) {
    return <Spinner label="Loading chat" className="p-4" />;
  }

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && !pending && (
          <div className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
            <p className="font-medium">Ask anything about this document.</p>
            <p className="mt-1 text-brand-600">
              Answers are grounded in the PDF and cite the pages they came from. If something is not in
              the document, the assistant will say so.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onCitationClick={onCitationClick} />
        ))}

        {pending && (
          <div className="rounded-lg bg-white p-3 shadow-card">
            {pending.text ? (
              // The caret makes it visible that tokens are still arriving over
              // the SSE stream rather than the answer being complete.
              <div className="relative">
                <RichText onPageClick={onCitationClick}>{pending.text}</RichText>
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand-500 align-text-bottom" />
              </div>
            ) : (
              <Spinner label="Searching the document" />
            )}
          </div>
        )}

        {error && <Alert>{error}</Alert>}
      </div>

      <div className="border-t border-surface-border bg-white p-3">
        {!isReady && (
          <p className="mb-2 text-xs text-ink-muted">
            {doc.status === 'FAILED'
              ? 'This document could not be processed, so chat is unavailable.'
              : 'Chat unlocks once processing finishes.'}
          </p>
        )}
        <TextArea
          rows={2}
          disabled={!isReady || isAnswering}
          placeholder={isReady ? 'Ask a question…' : 'Waiting for processing…'}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void ask();
            }
          }}
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" isLoading={isAnswering} disabled={!isReady || !question.trim()} onClick={() => void ask()}>
            Ask
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: ChatMessage;
  onCitationClick: (page: number) => void;
}) {
  const isUser = message.role === 'user';

  // The prompt asks the model to cite inline, e.g. "…30 days' notice (p. 4)".
  // When it does, those markers are the citations and a separate source list is
  // noise. The list is kept only as a fallback for answers with no inline cite,
  // so retrieved pages are never hidden from the user entirely.
  const showSourceList = !isUser && message.citations.length > 0 && !hasInlineCitations(message.content);

  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={
          isUser
            ? 'max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-sm text-white'
            : 'max-w-[92%] rounded-2xl rounded-bl-md bg-white p-3 shadow-card'
        }
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <RichText onPageClick={onCitationClick}>{message.content}</RichText>
        )}

        {showSourceList && (
          <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-surface-border pt-2">
            <span className="text-xs text-ink-subtle">Sources:</span>
            {message.citations.map((citation) => (
              <button
                key={citation.chunk_id}
                type="button"
                title={citation.excerpt}
                onClick={() => onCitationClick(citation.page_start)}
                className="rounded-full transition-opacity hover:opacity-80"
              >
                <Badge tone="brand">
                  {citation.page_start === citation.page_end
                    ? `p. ${citation.page_start}`
                    : `pp. ${citation.page_start}–${citation.page_end}`}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
