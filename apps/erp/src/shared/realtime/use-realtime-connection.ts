import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from '@mekong-erp/ui';
import { REALTIME_WS_URL, RealtimeEventSchema, type RealtimeEvent } from '@mekong-erp/contract';
import { useRealtimeStore } from './realtime-store';

/**
 * Opens the mock WebSocket channel once per app-shell mount and reacts to
 * events emitted by this same tab's own mutations (ADR-0002: same-tab
 * baseline — there is no real server pushing these). Reconnects on close
 * since MSW's mock socket can drop across a "Reset demo data" reseed.
 */
export function useRealtimeConnection(): void {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  useEffect(() => {
    let socket: WebSocket | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    function connect() {
      if (stopped) return;
      socket = new WebSocket(REALTIME_WS_URL);
      socket.addEventListener('message', (message) => {
        let raw: unknown;
        try {
          raw = JSON.parse(String(message.data));
        } catch {
          return;
        }
        const parsed = RealtimeEventSchema.safeParse(raw);
        if (parsed.success) handleEvent(parsed.data);
      });
      socket.addEventListener('close', () => {
        if (!stopped) reconnectTimer = setTimeout(connect, 1000);
      });
    }

    function handleEvent(event: RealtimeEvent) {
      switch (event.type) {
        case 'stock.changed': {
          useRealtimeStore.getState().markChanged(`${event.productId}:${event.warehouseId}`);
          void queryClient.invalidateQueries({ queryKey: ['stock-levels'] });
          void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
          break;
        }
        case 'approval.requested': {
          void queryClient.invalidateQueries({ queryKey: ['approvals'] });
          toast({
            title: t('realtime.approvalRequested.title'),
            description: t('realtime.approvalRequested.description', {
              docNumber: event.docNumber,
              role: t(`roles.${event.approverRole}`, { defaultValue: event.approverRole }),
            }),
          });
          break;
        }
        case 'approval.decided': {
          void queryClient.invalidateQueries({ queryKey: ['approvals'] });
          void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
          toast({
            title: t(`realtime.approvalDecided.${event.decision}`),
            description: event.docNumber,
            variant: event.decision === 'rejected' ? 'destructive' : 'default',
          });
          break;
        }
        case 'document.posted': {
          void queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
          void queryClient.invalidateQueries({ queryKey: ['general-ledger'] });
          void queryClient.invalidateQueries({ queryKey: ['ar-aging'] });
          void queryClient.invalidateQueries({ queryKey: ['ap-aging'] });
          void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          break;
        }
      }
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [queryClient, t]);
}
