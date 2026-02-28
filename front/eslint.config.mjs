import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Corps obligatoire (accolades) après if / else / for / while / do
      "curly": ["error", "all"],
      // Retour à la ligne obligatoire à l'intérieur des accolades (interdit le one-liner)
      "brace-style": ["error", "1tbs", { allowSingleLine: false }],
      // Longueur de ligne max 100 caractères
      "max-len": [
        "warn",
        {
          code: 100,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreComments: true,
        },
      ],
    },
  },
]);

export default eslintConfig;
