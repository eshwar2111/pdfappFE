import { api, API_PREFIX } from '@/api/client';
import type {
  ChatMessage,
  Comment,
  Conversation,
  DocumentDetail,
  DocumentFile,
  DocumentSearchResult,
  DocumentSummary,
  GuestSession,
  Page,
  Permission,
  Share,
  ShareCreated,
  SharePreview,
  TokenResponse,
  User,
} from '@/types/api';

/** Every backend call, in one module. Components never build a URL. */

export const authApi = {
  signup: (body: { name: string; email: string; password: string }) =>
    api.post<TokenResponse>('/auth/signup', body).then((r) => r.data),

  login: (body: { email: string; password: string }) =>
    api.post<TokenResponse>('/auth/login', body).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  /** Always resolves the same way, registered or not — no enumeration oracle. */
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    api.post<TokenResponse>('/auth/reset-password', { token, password }).then((r) => r.data),
};

export const documentsApi = {
  upload: (file: File, onProgress?: (percent: number) => void) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<DocumentSummary>('/documents', form, {
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        },
      })
      .then((r) => r.data);
  },

  list: (params: { q?: string; limit?: number; offset?: number } = {}) =>
    api.get<Page<DocumentSummary>>('/documents', { params }).then((r) => r.data),

  search: (q: string, limit = 20) =>
    api.get<DocumentSearchResult[]>('/documents/search', { params: { q, limit } }).then((r) => r.data),

  get: (documentId: string) =>
    api.get<DocumentDetail>(`/documents/${documentId}`).then((r) => r.data),

  file: (documentId: string) =>
    api.get<DocumentFile>(`/documents/${documentId}/file`).then((r) => r.data),

  remove: (documentId: string) => api.delete<void>(`/documents/${documentId}`).then(() => undefined),
};

export const sharesApi = {
  create: (
    documentId: string,
    body: { permissions: Permission[]; expires_in_hours?: number | null; invited_email?: string | null },
  ) => api.post<ShareCreated>(`/documents/${documentId}/shares`, body).then((r) => r.data),

  list: (documentId: string) =>
    api.get<Share[]>(`/documents/${documentId}/shares`).then((r) => r.data),

  revoke: (documentId: string, shareId: string) =>
    api.delete<void>(`/documents/${documentId}/shares/${shareId}`).then(() => undefined),

  /** Unauthenticated — what a visitor sees before identifying themselves. */
  preview: (token: string) => api.get<SharePreview>(`/shares/${token}`).then((r) => r.data),

  /** Unauthenticated — exchanges the link for a scoped guest credential. */
  startSession: (token: string, displayName: string) =>
    api
      .post<GuestSession>(`/shares/${token}/session`, { display_name: displayName })
      .then((r) => r.data),
};

export const commentsApi = {
  list: (documentId: string) =>
    api.get<Comment[]>(`/documents/${documentId}/comments`).then((r) => r.data),

  /** No author field — the server derives authorship from the caller's token. */
  create: (documentId: string, body: { body: string; parent_comment_id?: string | null }) =>
    api.post<Comment[]>(`/documents/${documentId}/comments`, body).then((r) => r.data),

  update: (documentId: string, commentId: string, body: string) =>
    api.patch<Comment[]>(`/documents/${documentId}/comments/${commentId}`, { body }).then((r) => r.data),

  remove: (documentId: string, commentId: string) =>
    api.delete<Comment[]>(`/documents/${documentId}/comments/${commentId}`).then((r) => r.data),
};

export const chatApi = {
  history: (documentId: string) =>
    api.get<Conversation>(`/documents/${documentId}/chat`).then((r) => r.data),

  ask: (documentId: string, question: string) =>
    api
      .post<{ conversation_id: string; message: ChatMessage }>(`/documents/${documentId}/chat`, {
        question,
      })
      .then((r) => r.data),

  /** Streaming URL — consumed via fetch, since EventSource cannot POST. */
  streamUrl: (documentId: string) => `${API_PREFIX}/documents/${documentId}/chat/stream`,
};
