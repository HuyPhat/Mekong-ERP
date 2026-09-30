import { useRealtimeConnection } from './use-realtime-connection';

/** Renders nothing — just keeps the realtime WS hook mounted for the lifetime of the authenticated shell. */
export function RealtimeConnection() {
  useRealtimeConnection();
  return null;
}
