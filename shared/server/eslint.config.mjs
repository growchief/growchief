// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-empty': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'no-async-promise-executor': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-duplicate-type-constituents': 'off',
      '@typescript-eslint/only-throw-error': 'off',
      'no-case-declarations': 'off',
      'no-extra-boolean-cast': 'off',
    },
  },
);
