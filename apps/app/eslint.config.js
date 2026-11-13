import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { domainBoundaries } from './eslint-rules/domainBoundaries.js'

export default tseslint.config(
  { ignores: ['dist', 'cypress.config.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // `const { userId, ...rest } = args` drops userId on purpose.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    },
  },
  {
    // Each domain is used from outside only through its index.ts (see eslint-rules/domainBoundaries.js).
    files: ['src/**/*.{ts,tsx}'],
    plugins: { local: { rules: { 'domain-boundaries': domainBoundaries } } },
    rules: { 'local/domain-boundaries': 'error' },
  },
  {
    // Named exports only in the app's code: one name per thing, everywhere it's imported.
    // (Config files such as vite.config.ts need a default export, so they're left out.)
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Use a named export instead of export default.' },
      ],
    },
  },
)
