import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'out/**', '.turbo/**', 'coverage/**'],
  },
);
