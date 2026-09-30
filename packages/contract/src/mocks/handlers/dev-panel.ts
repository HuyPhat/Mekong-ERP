import { delay, http, HttpResponse } from 'msw';
import { getDevConfig, pickLatencyMs, shouldFail } from '../../dev-config';

// Returning undefined from a resolver makes MSW fall through to the next
// matching handler, so this catch-all only adds latency / injected failures
// in front of the real handlers. The session endpoint is exempt so a failure
// toggle can never lock the demo user out of the app.
export const devPanelHandlers = [
  http.all('/api/*', async ({ request }) => {
    if (new URL(request.url).pathname === '/api/session') return undefined;
    const config = getDevConfig();
    const latency = pickLatencyMs(config);
    if (latency > 0) await delay(latency);
    if (shouldFail(config)) {
      return HttpResponse.json(
        { code: 'SERVICE_UNAVAILABLE', message: 'Simulated failure from the demo dev panel.' },
        { status: 503 },
      );
    }
    return undefined;
  }),
];
