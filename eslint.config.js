import { react } from './packages/config/eslint/react.js';

export default [
  ...react,
  {
    ignores: ['**/routeTree.gen.ts', '**/dist/**', '**/.next/**', '**/out/**'],
  },
];
