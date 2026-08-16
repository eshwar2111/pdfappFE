/** Mirrors the backend's Pydantic schemas. */

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export type ProcessingFailureReason =
  | 'NO_EXTRACTABLE_TEXT'
  | 'CORRUPT_PDF'
  | 'ENCRYPTED_PDF'
  | 'EMBEDDING_FAILED'
  | 'SUMMARY_FAILED'
  | 'UNKNOWN';

export type Permission = 'VIEW' | 'COMMENT' | 'CHAT' | 'MANAGE';

export type PrincipalKind = 'user' | 'guest';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface DocumentSummary {
  id: string;
  filename: string;
  size_bytes: number;
  page_count: number | null;
  status: DocumentStatus;
  failure_reason: ProcessingFailureReason | null;
  summary: string | null;
  created_at: string;
}

export interface DocumentDetail extends DocumentSummary {
  chunk_count: number | null;
  permissions: Permission[];
  is_owner: boolean;
}

export interface DocumentFile {
  url: string;
  expires_at: string;
  filename: string;
}

export interface DocumentSearchResult {
  document: DocumentSummary;
  relevance: number | null;
  excerpt: string | null;
  matched_on: 'filename' | 'content' | 'both';
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthorRef {
  kind: PrincipalKind;
  id: string;
  display_name: string;
  is_document_owner: boolean;
}

export interface Comment {
  id: string;
  document_id: string;
  parent_comment_id: string | null;
  author: AuthorRef | null;
  body: string;
  is_deleted: boolean;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
  replies: Comment[];
}

export interface Citation {
  chunk_id: string;
  chunk_index: number;
  page_start: number;
  page_end: number;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  document_id: string;
  messages: ChatMessage[];
}

export interface SharePreview {
  document_id: string;
  filename: string;
  permissions: Permission[];
  owner_name: string;
}

export interface GuestSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  guest_session_id: string;
  display_name: string;
  document_id: string;
  permissions: Permission[];
}

export interface Share {
  id: string;
  document_id: string;
  permissions: Permission[];
  invited_email: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface ShareCreated extends Share {
  url: string;
}

export interface ApiErrorBody {
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string | null;
}
