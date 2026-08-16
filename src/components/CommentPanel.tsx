import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/api/client';
import { commentsApi } from '@/api/endpoints';
import { Alert, Badge, Button, EmptyState, Spinner, TextArea } from '@/components/ui';
import { formatRelative } from '@/lib/format';
import { RichText } from '@/lib/markdown';
import type { Comment, Permission } from '@/types/api';

interface CommentPanelProps {
  documentId: string;
  permissions: Permission[];
}

/**
 * Threaded comments for both registered users and invited guests.
 *
 * There is no author field anywhere in this component's writes — the server
 * derives authorship from the caller's token, so the UI cannot claim an
 * identity it does not hold.
 */
export function CommentPanel({ documentId, permissions }: CommentPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const canComment = permissions.includes('COMMENT');

  const load = useCallback(async () => {
    try {
      setComments(await commentsApi.list(documentId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load comments.');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (body: string, parentId: string | null) => {
      const updated = await commentsApi.create(documentId, {
        body,
        parent_comment_id: parentId,
      });
      setComments(updated);
      setReplyingTo(null);
    },
    [documentId],
  );

  const remove = useCallback(
    async (commentId: string) => {
      setComments(await commentsApi.remove(documentId, commentId));
    },
    [documentId],
  );

  if (isLoading) {
    return <Spinner label="Loading comments" className="p-4" />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {error && <Alert>{error}</Alert>}

        {comments.length === 0 && !error ? (
          <EmptyState
            title="No comments yet"
            description={
              canComment
                ? 'Start the discussion — anyone with this link can join in.'
                : 'This link is view-only, so you cannot add comments.'
            }
          />
        ) : (
          comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              canComment={canComment}
              replyingTo={replyingTo}
              onReplyTo={setReplyingTo}
              onSubmit={submit}
              onDelete={remove}
            />
          ))
        )}
      </div>

      {canComment && (
        <div className="border-t border-surface-border bg-white p-3">
          <CommentComposer
            placeholder="Add a comment…"
            submitLabel="Comment"
            onSubmit={(body) => submit(body, null)}
          />
        </div>
      )}
    </div>
  );
}

function CommentThread({
  comment,
  canComment,
  replyingTo,
  onReplyTo,
  onSubmit,
  onDelete,
}: {
  comment: Comment;
  canComment: boolean;
  replyingTo: string | null;
  onReplyTo: (id: string | null) => void;
  onSubmit: (body: string, parentId: string | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <CommentCard comment={comment} onDelete={onDelete} />

      {comment.replies.length > 0 && (
        <div className="ml-4 space-y-2 border-l-2 border-surface-border pl-3">
          {comment.replies.map((reply) => (
            <CommentCard key={reply.id} comment={reply} onDelete={onDelete} />
          ))}
        </div>
      )}

      {canComment && !comment.is_deleted && (
        <div className="ml-4">
          {replyingTo === comment.id ? (
            <CommentComposer
              placeholder="Write a reply…"
              submitLabel="Reply"
              autoFocus
              onCancel={() => onReplyTo(null)}
              onSubmit={(body) => onSubmit(body, comment.id)}
            />
          ) : (
            <button
              type="button"
              className="text-xs font-medium text-brand-600 hover:underline"
              onClick={() => onReplyTo(comment.id)}
            >
              Reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CommentCard({
  comment,
  onDelete,
}: {
  comment: Comment;
  onDelete: (id: string) => Promise<void>;
}) {
  const author = comment.author;

  return (
    <div className="rounded-lg border border-surface-border bg-white p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium">{author?.display_name ?? 'Unknown'}</span>

        {/* Guests are always badged, so a visitor cannot visually pass as the owner. */}
        {author?.kind === 'guest' && <Badge tone="neutral">Guest</Badge>}
        {author?.is_document_owner && <Badge tone="brand">Owner</Badge>}

        <span className="ml-auto text-xs text-ink-subtle">{formatRelative(comment.created_at)}</span>
      </div>

      {comment.is_deleted ? (
        <p className="text-sm italic text-ink-subtle">This comment was deleted.</p>
      ) : (
        <RichText>{comment.body}</RichText>
      )}

      {comment.can_edit && !comment.is_deleted && (
        <button
          type="button"
          className="mt-2 text-xs text-ink-subtle hover:text-red-600"
          onClick={() => void onDelete(comment.id)}
        >
          Delete
        </button>
      )}
    </div>
  );
}

function CommentComposer({
  placeholder,
  submitLabel,
  autoFocus,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSaving(true);
    try {
      await onSubmit(trimmed);
      setBody('');
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post your comment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <TextArea
        rows={3}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          // Enter sends; Shift+Enter is a newline.
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      />
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center gap-2">
        <Button size="sm" isLoading={isSaving} onClick={() => void handleSubmit()} disabled={!body.trim()}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <span className="ml-auto text-xs text-ink-subtle">**bold** *italic* - list</span>
      </div>
    </div>
  );
}
