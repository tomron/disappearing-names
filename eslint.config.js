import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'dist-smoke-*', 'public/data', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['e2e/**/*.mjs'],
    languageOptions: {
      globals: {
        document: 'readonly',
        getComputedStyle: 'readonly',
        innerWidth: 'readonly',
        console: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        axe: 'readonly',
      },
    },
  },
  ...tseslint.configs.recommended,
);
