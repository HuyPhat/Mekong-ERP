import { ws } from 'msw';
import { REALTIME_WS_URL, type RealtimeEvent } from '../realtime-events';

export const eventsLink = ws.link(REALTIME_WS_URL);

function noop(): void {
  // Registers interception for REALTIME_WS_URL. broadcastEvent() below pushes
  // to every connected client via the link's own tracked client set, so no
  // per-connection handling is needed here.
}

export const wsHandlers = [eventsLink.addEventListener('connection', noop)];

/** Called by REST/GraphQL handlers after a mutation to push the matching realtime event to this tab's own connection(s) — same-tab baseline per ADR-0002. */
export function broadcastEvent(event: RealtimeEvent): void {
  eventsLink.broadcast(JSON.stringify(event));
}
