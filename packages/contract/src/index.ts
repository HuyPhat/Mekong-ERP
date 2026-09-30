// Framework-agnostic: schemas, client, MSW handlers, and seed live here.
export { z } from './zod';
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
export * from './accounting-client';
export * from './sales-entities';
export * from './sales-client';
export * from './hrm-entities';
export * from './hrm-client';
export * from './leave';
export * from './ledger';
export * from './money';
export * from './vnd-words';
export * from './document-number';
export * from './realtime-events';
export * from './graphql-client';
export * from './dashboard-client';
export { ensureSeeded, resetSeed, type SeedProfile } from './seed';
export {
  DEFAULT_DEV_CONFIG,
  DevConfigSchema,
  getDevConfig,
  setDevConfig,
  type DevConfig,
} from './dev-config';
export { PRODUCT_CATEGORIES, PRODUCT_UNITS } from './seed/product-catalog';
