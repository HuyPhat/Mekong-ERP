import { http, HttpResponse } from 'msw';
import { z } from '../../zod';
import { DEMO_USERS } from '../../demo-users';
import type { Session } from '../../schemas';
import { readActiveUserId, writeActiveUserId } from '../session-store';

const LoginRequestSchema = z.object({ userId: z.string() });

function currentSession(): Session {
  const id = readActiveUserId();
  return { user: DEMO_USERS.find((user) => user.id === id) ?? null };
}

export const sessionHandlers = [
  http.get('/api/session', () => HttpResponse.json(currentSession())),

  http.post('/api/session', async ({ request }) => {
    const parsed = LoginRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Invalid login request',
          fieldErrors: z.flattenError(parsed.error).fieldErrors,
        },
        { status: 422 },
      );
    }
    const exists = DEMO_USERS.some((user) => user.id === parsed.data.userId);
    if (!exists) {
      return HttpResponse.json(
        { code: 'NOT_FOUND', message: 'Unknown demo user' },
        { status: 404 },
      );
    }
    writeActiveUserId(parsed.data.userId);
    return HttpResponse.json(currentSession());
  }),

  http.delete('/api/session', () => {
    writeActiveUserId(null);
    return HttpResponse.json(currentSession());
  }),
];
