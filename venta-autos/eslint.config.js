import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.test-postgres*', 'tmp', 'test-results', 'output']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['server.js', 'backend/**/*.js', 'tests/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }] },
  },
  {
    files: ['src/App.jsx', 'src/components/CarCard.jsx', 'src/components/SiteHeader.jsx'],
    rules: { 'no-empty': ['error', { allowEmptyCatch: true }] },
  },
  {
    files: ['src/App.jsx', 'src/pages/PagoResultado.jsx'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
  {
    files: ['backend/receipt.js'],
    rules: { 'no-control-regex': 'off' },
  },
])
