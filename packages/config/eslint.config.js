// LOCAL ESLint flat config. NOTE: upstream @platform/config does NOT ship an
// eslint preset (it uses Prettier + Ruff + Vitest). This is a deliberate local
// addition; if @platform/config later exports `./eslint`, switch to consuming it.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/.expo/**", "**/node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
