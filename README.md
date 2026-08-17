# PDF Intelligence & Collaboration — Frontend

React + TypeScript SPA for uploading PDFs, reading AI summaries, asking
questions about a document, sharing it by link, and commenting.

| | |
|---|---|
| **Live app** | <https://nice-ocean-0f59a2900.7.azurestaticapps.net> |
| **API** | <https://pdf-intelligence-api-bccedkabcaczf4er.centralindia-01.azurewebsites.net> |
| **Backend repo** | <https://github.com/eshwar2111/pdfappBE> |

Hosted on Azure Static Web Apps; deployment steps live in the backend repo's
`DEPLOYMENT.md`.

---

## Stack

React 18 · TypeScript (strict) · Vite 6 · Tailwind CSS · React Router 6 ·
Axios · react-pdf (pdf.js)

---

## Running locally

The backend must be running first — see its README.

```bash
npm install
cp .env.example .env      # optional in development
npm run dev               # http://localhost:5173
```

In development, `VITE_API_BASE_URL` is left empty and Vite proxies `/api` to
`http://localhost:8000`. That keeps the browser on one origin, so CORS and the
local file-download endpoint both work without extra configuration.

Point the proxy elsewhere with `VITE_DEV_API_TARGET=http://host:port npm run dev`.

### Production build

```bash
VITE_API_BASE_URL=https://your-api.azurewebsites.net npm run build
```

Output lands in `dist/`. `staticwebapp.config.json` configures Azure Static Web
Apps to rewrite unknown paths to `index.html`, which client-side routing needs —
without it, refreshing on `/s/<token>` returns a 404.

The backend's `CORS_ORIGINS` must include the deployed frontend origin.

---

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend origin. Empty in dev (proxied). |
| `VITE_DEV_API_TARGET` | Dev-only proxy target. Defaults to `http://localhost:8000`. |

**No secret belongs in this file.** Vite inlines every `VITE_*` variable into
the client bundle, where it is readable by anyone. The Gemini API key exists
only in the backend environment; the browser never calls an LLM provider
directly.

---

## Structure

```
src/
├── api/
│   ├── client.ts        axios instance, auth interceptor, ApiError
│   └── endpoints.ts     every backend call — components never build a URL
├── components/
│   ├── ui/index.tsx     Button, Input, Badge, Modal, Alert, Spinner, EmptyState
│   ├── PdfViewer.tsx    react-pdf viewer with zoom and citation scroll-to
│   ├── ChatPanel.tsx    streaming chat with page citations
│   ├── CommentPanel.tsx threaded comments
│   ├── DocumentWorkspace.tsx  viewer + panel layout shared by both routes
│   ├── DocumentCard.tsx dashboard card: filename, date, AI summary
│   ├── UploadZone.tsx   drag-and-drop upload with progress
│   └── ShareDialog.tsx  create / list / revoke share links
├── context/AuthContext.tsx   user and guest sessions
├── lib/
│   ├── format.ts        dates, sizes, human-readable failure reasons
│   └── markdown.tsx     safe markdown subset for comments
├── pages/               Login, Signup, Dashboard, Document, SharedDocument, NotFound
└── types/api.ts         mirrors the backend schemas
```

---

## Notes on the implementation

### One workspace, two principals

`DocumentWorkspace` renders the owner's view and the invited guest's view. It
takes no "am I a guest?" flag — it renders from `document.permissions`, which
the server computes. Adding a permission is a server change; the UI follows.

### Guest identity

`/s/:shareToken` previews the link, collects a display name once, and exchanges
it for a guest token scoped to that one document. The token is stored per share
link, so:

- refreshing the page keeps the same identity (comments stay attributable),
- a visitor can hold sessions for several links at once,
- a signed-in user who opens someone else's link acts as a guest on it, because
  `activateGuest()` makes the API client prefer that link's token.

The display name is never sent with a comment — it lives in the server's guest
session row. The client cannot claim an identity it does not hold.

### Streaming chat

`EventSource` cannot issue a POST or set an `Authorization` header, so the SSE
stream is read from a `fetch` response body and framed manually on blank lines.
Citations arrive before the first token, so the source list renders while the
answer is still being written. Clicking a citation scrolls the viewer to that
page.

### Polling

The dashboard and document pages poll only while something is in `UPLOADED` or
`PROCESSING`, and the interval is torn down once everything reaches a terminal
state. An idle dashboard runs no timers.

### Comment formatting

`lib/markdown.tsx` renders a deliberately small subset — bold, italic, inline
code, bullet lists — as React elements. It never produces raw HTML, so
`dangerouslySetInnerHTML` is not used anywhere and a comment cannot inject
markup. A full markdown library would need a sanitiser alongside it.

### Token storage

Tokens live in `localStorage`. This is a documented trade-off: it is readable
by XSS, but the app has no cross-site cookie flow, and httpOnly cookies would
require CSRF protection plus a same-site deployment topology that split
frontend/backend hosting does not provide.

### Responsive layout

Below `lg`, the viewer and side panel stack vertically and the panel becomes
tabbed (AI Chat / Comments). Above it, they sit side by side. PDF pages render
at the container's measured width via `ResizeObserver`, so the viewer never
scrolls horizontally on a phone.

### Bundle

`react-pdf` and `pdfjs-dist` are split into their own chunk, so the dashboard
does not pay for the PDF renderer until a document is opened.
