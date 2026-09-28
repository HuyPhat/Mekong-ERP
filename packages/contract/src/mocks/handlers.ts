import { sessionHandlers } from './handlers/session';
import { inventoryHandlers } from './handlers/inventory';

export const handlers = [...sessionHandlers, ...inventoryHandlers];
