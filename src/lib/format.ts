import type { DocumentStatus, ProcessingFailureReason } from '@/types/api';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.round((Date.now() - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`;
  return formatDate(iso);
}

/** User-facing text for each terminal failure the backend can report. */
const FAILURE_MESSAGES: Record<ProcessingFailureReason, string> = {
  NO_EXTRACTABLE_TEXT:
    'No text could be read from this PDF — it looks like a scan. Summary and chat are unavailable.',
  CORRUPT_PDF: 'This PDF could not be parsed. Try re-exporting and uploading again.',
  ENCRYPTED_PDF: 'This PDF is password-protected, so its contents could not be read.',
  EMBEDDING_FAILED: 'The AI service was unavailable while indexing this document. Try re-uploading.',
  SUMMARY_FAILED: 'The summary could not be generated, but chat should still work.',
  UNKNOWN: 'Something went wrong while processing this document.',
};

export function describeFailure(reason: ProcessingFailureReason | null): string {
  return reason ? FAILURE_MESSAGES[reason] : FAILURE_MESSAGES.UNKNOWN;
}

export function isProcessing(status: DocumentStatus): boolean {
  return status === 'UPLOADED' || status === 'PROCESSING';
}
