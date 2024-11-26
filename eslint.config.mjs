import js from "@eslint/js";
import ts from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default ts.config(
  js.configs.recommended,
  ts.configs.recommended,
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  importPlugin.flatConfigs.typescript,
  eslintPluginPrettierRecommended,
  {
    rules: {
      "prettier/prettier": "error",
      "constructor-super": "off",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/explicit-function-return-type": ["error", {allowExpressions: true}],
      "@typescript-eslint/member-ordering": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-require-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", {varsIgnorePattern: "^_"}],
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/explicit-member-accessibility": ["error", {accessibility: "no-public"}],
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "import/no-extraneous-dependencies": [
        "error",
        {devDependencies: false, optionalDependencies: false, peerDependencies: false},
      ],
      "func-call-spacing": "error",
      "import/no-duplicates": "off",
      "new-parens": "error",
      "no-caller": "error",
      "no-bitwise": "off",
      "no-cond-assign": "error",
      "no-consecutive-blank-lines": 0,
      "no-console": "warn",
      "no-var": "error",
      "object-curly-spacing": ["error", "never"],
      "object-literal-sort-keys": 0,
      "no-prototype-builtins": 0,
      "prefer-const": "error",
      quotes: ["error", "double"],
      semi: "error",
    },
    languageOptions: {
      globals: {
        BigInt: true,
      },
      parserOptions: {
        ecmaVersion: 10,
        project: "./tsconfig.json",
      },
    },
  },
  {
    files: ["**/test/**/*.ts"],
    rules: {
      "import/no-extraneous-dependencies": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off"
    },
  }
);
