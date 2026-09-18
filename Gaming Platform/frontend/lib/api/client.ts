import type { ApiEnvelope } from "./types";

const TOKEN_COOKIE = "gp_token";

/**
 * Token storage backed by a readable cookie so that:
 *  - the API client can attach `Authorization: Bearer <token>` from the browser
 *  - Next.js middleware can read the token to guard protected routes
 * The token is NOT httpOnly so it can be read client-side; for production
 * with stricter CSRF protection, prefer a double-submit or httpOnly+edge
 * proxy pattern. This foundation keeps the flow simple and explicit.
 */
export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${TOKEN_COOKIE}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

export function setToken(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(
    token,
  )}; path=/; max-age=86400; samesite=lax`;
}

export function clearToken(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]> | null;

  constructor(
    message: string,
    status: number,
    errors: Record<string, string[]> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

/**
 * Centralized fetch wrapper for the backend API.
 * - Prefixes the configured API base URL
 * - Attaches the bearer token when `auth` is true (default)
 * - Normalizes the API envelope and throws ApiError on failure
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || json.success === false) {
    throw new ApiError(
      json.message ?? "Request failed",
      response.status,
      json.errors ?? null,
    );
  }

  return json.data;
}

/**
 * Like apiFetch but returns the full envelope including meta.
 * Useful for paginated endpoints where meta.pagination is needed.
 */
export async function apiFetchEnvelope<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || json.success === false) {
    throw new ApiError(
      json.message ?? "Request failed",
      response.status,
      json.errors ?? null,
    );
  }

  return json;
}
