import { ApiError } from './client';

interface GraphQlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

/** Minimal hand-rolled GraphQL client — no Apollo/urql (not in PLAN.md §3); MSW's `graphql.link` is the mock server side. */
export async function gqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as GraphQlResponse<T>;
  if (!res.ok || json.errors?.length) {
    throw new ApiError(res.status, {
      code: 'GRAPHQL_ERROR',
      message: json.errors?.[0]?.message ?? 'GraphQL request failed',
    });
  }
  if (json.data === undefined) {
    throw new ApiError(res.status, { code: 'GRAPHQL_ERROR', message: 'Empty GraphQL response' });
  }
  return json.data;
}
