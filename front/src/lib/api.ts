/**
 * Lightweight API client that attaches the NextAuth session token
 * to every request targeting the NestJS backend.
 *
 * All calls use a relative /api path — Next.js rewrites proxy them to the
 * backend service (see next.config.ts). This avoids the NEXT_PUBLIC_* build-time
 * baking issue.
 */

const API_BASE = "/api";

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(fetchOptions.headers ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }

  return res.json() as Promise<T>;
}
