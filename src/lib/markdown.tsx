import type { ReactNode } from 'react';

/**
 * A deliberately tiny markdown subset for assistant answers and comment
 * bodies: bold, italic, inline code, and bullet lists — plus inline page
 * citations.
 *
 * Written by hand rather than pulled from a markdown library because the
 * safety property matters more than the feature set: this never produces raw
 * HTML. Everything becomes React elements, so `dangerouslySetInnerHTML` is
 * never used and a comment cannot inject markup. A full markdown renderer
 * would need a sanitiser alongside it.
 */

/** Matches `(p. 4)` and `(pp. 4-5)`, which is the citation form the chat prompt asks for. */
const CITATION = /\((pp?)\.\s*(\d+)(?:\s*[-–—]\s*(\d+))?\)/;

//  Single tokenizer so inline styles and citations cannot overlap or
//  double-process each other. Capturing group keeps delimiters in the output.
const TOKEN = new RegExp(
  `(\\*\\*[^*]+\\*\\*|\\*[^*]+\\*|_[^_]+_|\`[^\`]+\`|${CITATION.source})`,
  'g',
);

interface InlineOptions {
  /** When provided, page citations render as buttons that jump the viewer. */
  onPageClick?: (page: number) => void;
}

function renderInline(text: string, keyPrefix: string, options: InlineOptions): ReactNode[] {
  // Scanned with exec rather than split(): split() with capturing groups also
  // emits the citation's sub-captures, which would have to be filtered out by
  // guessing — and a legitimate text fragment of bare digits would be eaten.
  const parts: string[] = [];
  const pattern = new RegExp(TOKEN.source, 'g');
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(match[0]);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  const nodes: ReactNode[] = [];
  let index = 0;

  for (const part of parts) {
    const key = `${keyPrefix}-${index}`;
    index += 1;

    const citation = CITATION.exec(part);
    if (citation && citation[0] === part) {
      const start = Number(citation[2]);
      const end = citation[3] ? Number(citation[3]) : start;
      const label = start === end ? `p. ${start}` : `pp. ${start}–${end}`;

      if (options.onPageClick) {
        nodes.push(
          <button
            key={key}
            type="button"
            onClick={() => options.onPageClick?.(start)}
            title={`Jump to page ${start}`}
            className="mx-0.5 inline-flex items-baseline rounded bg-brand-50 px-1.5 py-px align-baseline
                       text-[0.8em] font-medium text-brand-700 transition-colors
                       hover:bg-brand-100 hover:text-brand-800"
          >
            {label}
          </button>,
        );
      } else {
        nodes.push(
          <span key={key} className="text-ink-muted">
            ({label})
          </span>,
        );
      }
      continue;
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith('`') && part.endsWith('`')) {
      nodes.push(<code key={key}>{part.slice(1, -1)}</code>);
    } else if (
      (part.startsWith('*') && part.endsWith('*')) ||
      (part.startsWith('_') && part.endsWith('_'))
    ) {
      nodes.push(<em key={key}>{part.slice(1, -1)}</em>);
    } else {
      nodes.push(<span key={key}>{part}</span>);
    }
  }

  return nodes;
}

export function RichText({
  children,
  onPageClick,
}: {
  children: string;
  onPageClick?: (page: number) => void;
}) {
  const options: InlineOptions = { onPageClick };
  const lines = children.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item, `li-${blocks.length}-${index}`, options)}</li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet?.[1] !== undefined) {
      listItems.push(bullet[1]);
      return;
    }
    flushList();
    if (line.trim()) {
      blocks.push(<p key={`p-${index}`}>{renderInline(line, `p-${index}`, options)}</p>);
    }
  });
  flushList();

  return <div className="rich-text space-y-1 text-sm leading-relaxed">{blocks}</div>;
}

/** Whether an answer already cites pages inline, so a separate source list is redundant. */
export function hasInlineCitations(text: string): boolean {
  return new RegExp(CITATION.source).test(text);
}
