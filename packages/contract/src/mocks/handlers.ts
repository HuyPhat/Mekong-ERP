import { devPanelHandlers } from './handlers/dev-panel';
import { sessionHandlers } from './handlers/session';
import { inventoryHandlers } from './handlers/inventory';
import { purchasingHandlers } from './handlers/purchasing';
import { auditHandlers } from './handlers/audit';
import { salesHandlers } from './handlers/sales';
import { accountingHandlers } from './handlers/accounting';
import { dashboardHandlers } from './handlers/dashboard';
import { wsHandlers } from './ws';

export const handlers = [
  ...devPanelHandlers,
  ...sessionHandlers,
  ...inventoryHandlers,
  ...purchasingHandlers,
  ...auditHandlers,
  ...salesHandlers,
  ...accountingHandlers,
  ...dashboardHandlers,
  ...wsHandlers,
];
