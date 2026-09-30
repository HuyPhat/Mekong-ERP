// Deployment-specific URLs come from env at build time so nothing here has to
// be guessed: leave them unset and the demo links are simply hidden.
export const SITE_URL = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'http://localhost:3000';
export const DEMO_URL = process.env['NEXT_PUBLIC_DEMO_URL'] ?? '';
export const REPO_URL = 'https://github.com/HuyPhat/Mekong-ERP';

export const SITE_NAME = 'Mekong ERP';
export const SITE_DESCRIPTION =
  'A portfolio mini-ERP for a Vietnamese FMCG trading SME: procure-to-pay, order-to-cash, inventory, accounting-lite and an approval engine, built with React 19 on a fully mocked in-browser backend.';
