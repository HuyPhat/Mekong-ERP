import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message:
                "Import z from '@mekong-erp/contract' (or ./zod inside it). The wrapper disables Zod's JIT, whose eval probe violates the app's CSP (ADR-0012).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'build/**', '.next/**', 'out/**', '.turbo/**', 'coverage/**'],
  },
);
