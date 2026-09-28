// Framework-agnostic: schemas, client, MSW handlers, and seed live here.
export const CONTRACT_VERSION = '0.2.0';

export * from './schemas';
export * from './demo-users';
export * from './client';
export * from './entities';
export * from './list-query';
export * from './inventory-client';
export { ensureSeeded, resetSeed } from './seed';
export { PRODUCT_CATEGORIES, PRODUCT_UNITS } from './seed/products';
