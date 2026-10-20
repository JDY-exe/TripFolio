import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

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
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ConditionalExpression:has(> :matches(JSXElement, JSXFragment))',
          message:
            'Use condition && JSX for conditional rendering. Use separate guarded blocks for alternative branches.',
        },
        {
          selector:
            'JSXExpressionContainer:not([parent.type="JSXAttribute"]) > ConditionalExpression:has(> Literal[value=null])',
          message:
            'Use condition && JSX instead of a ternary with a null branch.',
        },
      ],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  eslintConfigPrettier,
]);
