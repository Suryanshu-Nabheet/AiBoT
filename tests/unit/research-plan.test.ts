import { describe, expect, it } from "vitest";
import { thinkingPlanRequestsResearch } from "@/lib/chat/research-plan";

describe("thinkingPlanRequestsResearch", () => {
  it("detects a planned check of current official documentation", () => {
    expect(
      thinkingPlanRequestsResearch(
        "I’ll verify the current official documentation and release notes before comparing these tools.",
        "Compare Alpha and Beta using the descriptions I provided.",
      ),
    ).toBe(true);
  });

  it("detects explicit web research plans", () => {
    expect(
      thinkingPlanRequestsResearch(
        "I’ll search the web for primary sources on the requested topic.",
        "Summarize the current privacy rules for this browser.",
      ),
    ).toBe(true);
  });

  it("does not treat ordinary reasoning or supplied evidence checks as a search", () => {
    expect(
      thinkingPlanRequestsResearch(
        "I’ll compare the supplied details and explain the main tradeoffs.",
      ),
    ).toBe(false);
    expect(
      thinkingPlanRequestsResearch(
        "I’ll verify the supplied source and note any gaps.",
        "Compare the supplied Alpha and Beta descriptions.",
      ),
    ).toBe(false);
    expect(
      thinkingPlanRequestsResearch(
        "I’ll verify the current weather and find recent local conditions.",
        "Compare the supplied Alpha and Beta descriptions.",
      ),
    ).toBe(false);
  });
});
