import { describe, expect, it } from "vitest";
import { evaluateSearchQuality } from "@/lib/server/web-search/quality-evaluation";

describe("web-search quality evaluation fixtures", () => {
  it("meets relevance and ranking thresholds on the fixed query set", () => {
    const report = evaluateSearchQuality();
    console.info("SEARCH_QUALITY_EVALUATION", JSON.stringify(report));

    expect(report.caseCount).toBeGreaterThanOrEqual(4);
    expect(report.meanReciprocalRank).toBeGreaterThanOrEqual(0.9);
    expect(report.precisionAtFive).toBeGreaterThanOrEqual(0.2);
    expect(report.results.every((result) => result.reciprocalRank > 0)).toBe(
      true,
    );
  });
});
