import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '.claude/worktrees/',
    'dist/',
    '.astro/',
    '.jampack/',
    '.wrangler/',
    '.wrangler-dry-run/',
    'node_modules/',
    'worker-configuration.d.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs['flat/recommended'],
  astro.configs['flat/jsx-a11y-recommended'],
  {
    // Type-aware rules catch unhandled promises and deprecated platform APIs in the Worker,
    // client utilities, config and tests. Each tsconfig covers a different runtime.
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeCheckedOnly],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.worker.json', './test/worker/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
  prettier,
]);
