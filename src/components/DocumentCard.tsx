import { Link } from 'react-router-dom';

import { Badge, Spinner } from '@/components/ui';
import { describeFailure, formatBytes, formatDate, isProcessing } from '@/lib/format';
import type { DocumentSummary } from '@/types/api';

/** Dashboard card: filename, upload date, AI summary, and a delete affordance. */
export function DocumentCard({
  document: doc,
  excerpt,
  relevance,
  onDelete,
}: {
  document: DocumentSummary;
  excerpt?: string | null;
  relevance?: number | null;
  onDelete: (document: DocumentSummary) => void;
}) {
  return (
    // The delete control cannot be nested inside the Link — a button inside an
    // anchor is invalid and clicking it would navigate. The card is a
    // positioned wrapper; the link fills it and the button sits above.
    <div className="group relative">
      <Link
        to={`/documents/${doc.id}`}
        className="card flex h-full flex-col gap-2 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-raised focus-visible:shadow-raised"
      >
        <div className="flex items-start gap-2 pr-7">
          <h3 className="min-w-0 flex-1 truncate font-display font-semibold" title={doc.filename}>
            {doc.filename}
          </h3>
          <StatusBadge status={doc.status} />
        </div>

        <p className="text-xs text-ink-subtle">
          {formatDate(doc.created_at)} · {formatBytes(doc.size_bytes)}
          {doc.page_count ? ` · ${doc.page_count} pages` : ''}
        </p>

        {isProcessing(doc.status) ? (
          <Spinner label="Generating AI insights…" />
        ) : doc.status === 'FAILED' ? (
          <p className="text-sm text-sand-700">{describeFailure(doc.failure_reason)}</p>
        ) : (
          <p className="line-clamp-4 text-sm leading-relaxed text-ink-muted">
            {doc.summary ?? 'No summary available.'}
          </p>
        )}

        {excerpt && (
          <div className="mt-auto rounded-lg bg-brand-50 px-2.5 py-2">
            <p className="text-xs font-medium text-brand-700">
              Matched content
              {typeof relevance === 'number' && ` · ${Math.round(relevance * 100)}% relevant`}
            </p>
            <p className="mt-0.5 line-clamp-2 text-xs italic text-brand-600">“{excerpt}”</p>
          </div>
        )}
      </Link>

      <button
        type="button"
        aria-label={`Delete ${doc.filename}`}
        title="Delete document"
        onClick={() => onDelete(doc)}
        className="absolute right-2.5 top-2.5 rounded-md p-1.5 text-ink-subtle opacity-0 transition-all
                   hover:bg-clay-50 hover:text-clay-600 focus-visible:opacity-100
                   group-hover:opacity-100"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentSummary['status'] }) {
  if (status === 'READY') return <Badge tone="success">Ready</Badge>;
  if (status === 'FAILED') return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="warning">Processing</Badge>;
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
