import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Only hooks talk to the API (tRPC) and auth (better-auth); components
    // and pages get data and actions from src/hooks.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/hooks/**', 'src/lib/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/lib/api', message: 'Call the API through a hook in src/hooks.' },
            { name: '@/lib/auth', message: 'Use useSession / useAuth from @/hooks/use-auth.' },
          ],
          patterns: [
            { group: ['@trpc/*', 'better-auth', 'better-auth/*'], message: 'Only src/hooks and src/lib use the API and auth clients.' },
          ],
        },
      ],
    },
  },
  {
    // shadcn components export helpers like buttonVariants next to the
    // component; they're generated, so allow it there rather than edit them.
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
