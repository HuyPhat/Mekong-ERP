import type { z } from './zod';
import { SessionSchema, type Session, type ApiErrorBody } from './schemas';

const API_BASE = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(status: number, body: Partial<ApiErrorBody>) {
    super(body.message ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    if (body.fieldErrors !== undefined) {
      this.fieldErrors = body.fieldErrors;
    }
  }
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const json: unknown = await res.json();
  if (!res.ok) {
    throw new ApiError(res.status, json as Partial<ApiErrorBody>);
  }
  return schema.parse(json);
}

export function fetchSession(): Promise<Session> {
  return request('/session', SessionSchema);
}

export function loginAs(userId: string): Promise<Session> {
  return request('/session', SessionSchema, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export function logout(): Promise<Session> {
  return request('/session', SessionSchema, { method: 'DELETE' });
}
