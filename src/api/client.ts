import axios, { AxiosError, type AxiosInstance } from 'axios';

import type { ApiErrorBody } from '@/types/api';

/**
 * One axios instance for the whole app.
 *
 * The auth token is injected by an interceptor rather than passed at each call
 * site, and the same interceptor serves registered users and invited guests —
 * both send `Authorization: Bearer`, so the API layer never branches on which
 * kind of principal is calling.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const API_PREFIX = `${BASE_URL}/api/v1`;

/** Normalised error so components render `error.message` and nothing else. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, code: string, status: number, requestId: string | null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

type TokenReader = () => string | null;
type UnauthorizedHandler = () => void;

let readToken: TokenReader = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/** Wired once by AuthProvider, so the client has no import cycle with React. */
export function configureAuth(reader: TokenReader, unauthorized: UnauthorizedHandler): void {
  readToken = reader;
  onUnauthorized = unauthorized;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_PREFIX,
  timeout: 60_000, // generous: an LLM round trip can be slow
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError('Could not reach the server. Check your connection.', 'network_error', 0, null),
      );
    }

    const { status, data } = error.response;

    // An expired or revoked credential is a session-level event, not something
    // each caller should handle. Signal it once, centrally.
    if (status === 401) {
      onUnauthorized();
    }

    return Promise.reject(
      new ApiError(
        data?.message ?? 'Something went wrong. Please try again.',
        data?.error_code ?? 'unknown_error',
        status,
        data?.request_id ?? null,
      ),
    );
  },
);

/** Absolute URL for a file link, which the API returns relative in local mode. */
export function resolveFileUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
}
