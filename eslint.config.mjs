/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing browser integrations expose untyped vendor APIs. Keep these visible
      // without making production builds fail while they are incrementally typed.
      "@typescript-eslint/no-explicit-any": "warn",
      // These React Compiler diagnostics were added to the Next 16 preset. AiBoT
      // does not enable the React Compiler and intentionally syncs browser state
      // after mount; keep the existing Hooks correctness rules active without
      // turning those established patterns into upgrade-blocking errors.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
    },
  },
  globalIgnores([
    "node_modules/**",
    ".next*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
