import { useCallback, useRef, useState } from 'react';

import { ApiError } from '@/api/client';
import { documentsApi } from '@/api/endpoints';
import { Alert, Button } from '@/components/ui';
import type { DocumentSummary } from '@/types/api';

const MAX_BYTES = 25 * 1024 * 1024;

export function UploadZone({ onUploaded }: { onUploaded: (document: DocumentSummary) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (file: File) => {
      // Client-side checks are for fast feedback only — the server re-validates
      // the extension, the declared type, and the file's magic bytes.
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files can be uploaded.');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError('That file is larger than the 25 MB limit.');
        return;
      }

      setError(null);
      setProgress(0);
      try {
        onUploaded(await documentsApi.upload(file, setProgress));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
      } finally {
        setProgress(null);
      }
    },
    [onUploaded],
  );

  return (
    <div className="space-y-2">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const file = event.dataTransfer.files[0];
          if (file) void upload(file);
        }}
        className={
          isDragging
            ? 'card border-2 border-dashed border-brand-500 bg-brand-50 p-6 text-center'
            : 'card border-2 border-dashed border-surface-border p-6 text-center'
        }
      >
        {progress !== null ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Uploading… {progress}%</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full bg-brand-600 transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium">Drop a PDF here</p>
            <p className="mt-1 text-xs text-ink-subtle">or choose a file — up to 25 MB</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = '';
              }}
            />
          </>
        )}
      </div>

      {error && <Alert>{error}</Alert>}
    </div>
  );
}
