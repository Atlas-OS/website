import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import astroParser from 'astro-eslint-parser';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs['flat/recommended'],

  {
    files: ['**/*.astro'],
    languageOptions: {
      globals: {
        Astro: 'readonly',
        Fragment: 'readonly',
      },
      parser: astroParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.astro'],
        project: './tsconfig.json',
      },
    },
    processor: astro.processors.astro,
  },

  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },

  prettierConfig,
  {
    ignores: ['dist/', '.astro/', 'node_modules/'],
  },
];
