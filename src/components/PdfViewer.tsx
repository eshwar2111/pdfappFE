import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { Alert, Button, Spinner } from '@/components/ui';

// pdf.js needs its worker. Resolved from the installed package rather than a
// CDN so the app has no external runtime dependency.
//
// pdfjs-dist is pinned to an exact version in package.json on purpose: pdf.js
// refuses to run when the API and worker versions differ, and react-pdf builds
// against one specific release. A caret range silently installs a newer patch
// and the viewer dies with "The API version does not match the Worker version".
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  fileUrl: string;
  /** Set by a chat citation to jump the viewer to a cited page. */
  targetPage?: number | null;
}

export function PdfViewer({ fileUrl, targetPage }: PdfViewerProps) {
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Render pages at the container's width so the viewer is usable on a phone
  // without horizontal scrolling.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Citation click → scroll that page into view.
  useEffect(() => {
    if (!targetPage) return;
    const node = pageRefs.current.get(targetPage);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(targetPage);
    }
  }, [targetPage]);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setPageCount(numPages);
    setError(null);
  }, []);

  const onLoadError = useCallback((cause: Error) => {
    // Keep the underlying message: "expired link" and "worker version mismatch"
    // are very different problems and a generic string hides which one it is.
    console.error('pdf.js failed to load the document', cause);
    setError(
      `This PDF could not be displayed (${cause.message}). ` +
        'The link may have expired — try reloading the page.',
    );
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-surface-border bg-white px-3 py-2">
        <span className="text-sm text-ink-muted">
          {pageCount > 0 ? `Page ${currentPage} of ${pageCount}` : 'Loading…'}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
            aria-label="Zoom out"
          >
            −
          </Button>
          <span className="w-12 text-center text-xs text-ink-muted">{Math.round(scale * 100)}%</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            aria-label="Zoom in"
          >
            +
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto bg-surface-muted p-3">
        {error ? (
          <Alert>{error}</Alert>
        ) : (
          <Document
            file={fileUrl}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading={<Spinner label="Loading document" className="justify-center py-12" />}
            className="flex flex-col items-center gap-3"
          >
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <div
                key={pageNumber}
                ref={(node) => {
                  if (node) pageRefs.current.set(pageNumber, node);
                  else pageRefs.current.delete(pageNumber);
                }}
                className="shadow-sm"
              >
                <Page
                  pageNumber={pageNumber}
                  width={width > 0 ? Math.min(width - 24, 900) * scale : undefined}
                  renderAnnotationLayer
                  renderTextLayer
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}
