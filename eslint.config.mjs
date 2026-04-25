import tseslint from 'typescript-eslint';

export default [
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs'],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      'newline-per-chained-call': ['error', { ignoreChainWithDepth: 2 }],
    },
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
];
