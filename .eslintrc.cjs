module.exports = {
  root: true,
  parser: 'astro-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    extraFileExtensions: ['.astro'],
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint', 'astro'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:astro/recommended',
    'prettier'
  ],
  ignorePatterns: ['dist/', '.astro/', 'node_modules/'],
  rules: {},
};