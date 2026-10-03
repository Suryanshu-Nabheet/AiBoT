import { describe, expect, it } from "vitest";
import { resolveComposerDensity } from "@/lib/chat/composer-mode";

describe("resolveComposerDensity", () => {
  it("uses hero layout for centered empty chat", () => {
    expect(resolveComposerDensity("center", false)).toBe("hero");
  });

  it("uses thread layout for docked compact follow-up composer", () => {
    expect(resolveComposerDensity("bottom", true)).toBe("thread");
  });

  it("keeps hero when bottom dock without compact flag", () => {
    expect(resolveComposerDensity("bottom", false)).toBe("hero");
  });
});
