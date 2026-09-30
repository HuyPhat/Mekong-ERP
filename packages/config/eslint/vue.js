import prettier from 'eslint-config-prettier';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import { base } from './base.js';

// The Vue counterpart of react.js: the shared TypeScript rules, plus eslint-plugin-vue
// with the TypeScript parser for the <script lang="ts"> blocks.
export const vue = [
  ...base,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
        sourceType: 'module',
      },
    },
    // TypeScript already rejects an undefined name, and knows the DOM's globals, which
    // this rule would have to be told about one by one. typescript-eslint turns it off
    // for .ts files for the same reason.
    rules: { 'no-undef': 'off' },
  },
  // Last, so formatting is Prettier's business alone and the Vue plugin's own
  // layout rules (attribute breaks, indentation) don't second-guess it.
  prettier,
];
