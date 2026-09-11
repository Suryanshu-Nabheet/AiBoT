/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "aibot",
    environment: "node",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      include: ["lib/**/*.ts", "hooks/**/*.ts"],
      exclude: ["**/*.d.ts", "**/types.ts"],
    },
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
