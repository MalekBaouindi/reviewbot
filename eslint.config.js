const tseslint = require("typescript-eslint");

module.exports = tseslint.config(
  { ignores: ["dist/", "node_modules/"] },
  {
    files: ["src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    rules: {
      "no-console": "warn",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  }
);
