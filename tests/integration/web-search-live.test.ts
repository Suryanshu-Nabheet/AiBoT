import { describe, expect, it } from "vitest";
import { searchWeb } from "@/lib/server/web-search/search";

/** CI runner IPs are often blocked by search providers; run locally before release. */
const runLiveSearch = process.env.CI !== "true";

describe.skipIf(!runLiveSearch)("searchWeb (live, keyless)", () => {
  it("returns at least one web result for a stable query", async () => {
    const { query, results } = await searchWeb("Next.js React framework", 5);
    expect(query).toBe("Next.js React framework");
    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.title.length).toBeGreaterThan(0);
      expect(result.href).toMatch(/^https?:\/\//);
      expect(result.domain.length).toBeGreaterThan(0);
      expect(result.brand).toBeTruthy();
    }
  }, 30_000);
});
