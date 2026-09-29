// Framework-agnostic: schemas, client, MSW handlers, and seed live here.
export const CONTRACT_VERSION = '0.3.0';

export * from './schemas';
export * from './demo-users';
export * from './client';
export * from './entities';
export * from './list-query';
export * from './inventory-client';
export * from './purchasing-entities';
export * from './purchasing-client';
export * from './approval-entities';
export * from './approvals-client';
export * from './approval-engine';
export * from './three-way-match';
export * from './audit-entities';
export * from './audit-client';
export * from './accounting-entities';
export * from './money';
export * from './document-number';
export { ensureSeeded, resetSeed } from './seed';
export { PRODUCT_CATEGORIES, PRODUCT_UNITS } from './seed/products';
