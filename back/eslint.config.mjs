// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
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
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto", printWidth: 100 }],
      // Corps obligatoire (accolades) après if / else / for / while / do
      'curly': ['error', 'all'],
      // Retour à la ligne obligatoire à l'intérieur des accolades (interdit le one-liner)
      'brace-style': ['error', '1tbs', { allowSingleLine: false }],
      // Longueur de ligne max 100 caractères (cohérent avec prettier printWidth)
      'max-len': ['warn', { code: 100, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreComments: true }],
    },
  },
);
