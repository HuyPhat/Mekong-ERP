import { sessionHandlers } from './handlers/session';
import { inventoryHandlers } from './handlers/inventory';
import { purchasingHandlers } from './handlers/purchasing';
import { auditHandlers } from './handlers/audit';

export const handlers = [
  ...sessionHandlers,
  ...inventoryHandlers,
  ...purchasingHandlers,
  ...auditHandlers,
];
