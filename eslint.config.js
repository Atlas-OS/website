import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist/',
    '.astro/',
    '.wrangler/',
    '.wrangler-dry-run/',
    'node_modules/',
    'worker-configuration.d.ts',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs['flat/recommended'],
  prettier,
]);
