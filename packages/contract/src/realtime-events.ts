// Shared shape for the mock WebSocket channel (`wss://mekong.mock/events`,
// ADR-0002). Same-tab baseline: events are emitted by mock handlers reacting
// to that tab's own mutations, not pushed from a real server.
import { z } from './zod';

export const StockChangedEventSchema = z.object({
  type: z.literal('stock.changed'),
  productId: z.string(),
  warehouseId: z.string(),
  quantityOnHand: z.number().int(),
});

export const ApprovalRequestedEventSchema = z.object({
  type: z.literal('approval.requested'),
  docType: z.string(),
  docId: z.string(),
  docNumber: z.string(),
  approverRole: z.string(),
});

export const ApprovalDecidedEventSchema = z.object({
  type: z.literal('approval.decided'),
  docType: z.string(),
  docId: z.string(),
  docNumber: z.string(),
  decision: z.enum(['approved', 'rejected', 'changes_requested']),
  approverRole: z.string(),
});

export const DocumentPostedEventSchema = z.object({
  type: z.literal('document.posted'),
  docType: z.string(),
  docId: z.string(),
  docNumber: z.string(),
});

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  StockChangedEventSchema,
  ApprovalRequestedEventSchema,
  ApprovalDecidedEventSchema,
  DocumentPostedEventSchema,
]);
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;

export const REALTIME_WS_URL = 'wss://mekong.mock/events';
