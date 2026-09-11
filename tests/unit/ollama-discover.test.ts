import { describe, expect, it } from "vitest";
import { buildOllamaScanCandidates } from "@/lib/chat/ollama-discover";

describe("buildOllamaScanCandidates", () => {
  it("includes loopback fallbacks for localhost preference", () => {
    const urls = buildOllamaScanCandidates("http://localhost:11434");
    expect(urls).toContain("http://localhost:11434");
    expect(urls).toContain("http://127.0.0.1:11434");
  });

  it("normalizes bare host", () => {
    const urls = buildOllamaScanCandidates("localhost:11434");
    expect(urls.some((u) => u.includes("11434"))).toBe(true);
  });
});
