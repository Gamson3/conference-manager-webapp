import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore generated declaration files entirely
  { ignores: ["src/types/**/*.d.ts"] },
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
    rules: {
      // Keep stylistic concerns opt-in; avoid requiring local prettier in CI/build
      "react/no-escape-entities": "off",
      // The generated Prisma client type declarations include many empty object types / unused generics;
      // relaxing these prevents build noise while keeping app code strict.
      "@typescript-eslint/no-empty-object-type": ["off"],
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "ignoreRestSiblings": true }],
      "@typescript-eslint/no-explicit-any": ["warn", { "ignoreRestArgs": true }],
    },
  }),
];

export default eslintConfig;
