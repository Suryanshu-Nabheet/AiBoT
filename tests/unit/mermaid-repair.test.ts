import { describe, expect, it } from "vitest";
import { buildMermaidRepairCandidates } from "@/lib/chat/mermaid-repair";

describe("buildMermaidRepairCandidates", () => {
  it("splits packed flowchart statements and normalizes subgraph keywords", () => {
    const source =
      "flowchart TD     Subgraph Development         Dev1[Developer<br>Git Repository] --> Build[Build]         Build --> Deploy{Deploy}         End([Production]) --> Subgraph{Real-Time Ops}     END";

    const [original, repaired] = buildMermaidRepairCandidates(source);

    expect(original).toBe(source);
    expect(repaired).toContain("flowchart TD\nsubgraph Development");
    expect(repaired).toContain("Dev1[Developer Git Repository]");
    expect(repaired).toContain("end");
  });

  it("leaves already valid multiline source unchanged", () => {
    const source = "flowchart TD\nA --> B";
    expect(buildMermaidRepairCandidates(source)).toEqual([source]);
  });

  it("closes subgraphs omitted by the model", () => {
    const [original, normalized, balanced] = buildMermaidRepairCandidates(
      "flowchart TD     subgraph System         A --> B",
    );

    expect(original).toContain("subgraph System");
    expect(normalized.match(/^end$/gm)).toBeNull();
    expect(balanced.match(/^end$/gm)).toHaveLength(1);
  });

  it("repairs the malformed AGI flowchart from the reported response", () => {
    const source = `flowchart TD
    Start((Current AI / Narrow AI)) --> |Task Specific | TaskAI1[Specialized Tasks]
    TaskAI1 -->|Learning | MLModel[Machine Learning Models]
    MLModel -->|Generalization Gap | [Narrow Capabilities]
    Subgraph AGI_Path["Path to AGI"]
        AGI1[General Reasoning] --> AGICap[Full Cognitive Abilities]
        Subgraph ASI_Path["Future Pathway"]
            AGICap -->|Optimization| ASI[Artificial Superintelligence]
        end
    end
    Start ==> |Goal | End((AGI / ASI State))`;

    const candidates = buildMermaidRepairCandidates(source);

    expect(
      candidates.some((candidate) =>
        candidate.includes("NarrowCapabilities[Narrow Capabilities]"),
      ),
    ).toBe(true);
    expect(
      candidates.some((candidate) => candidate.includes("subgraph AGI_Path")),
    ).toBe(true);
    expect(
      candidates.some((candidate) => candidate.includes("subgraph ASI_Path")),
    ).toBe(true);
  });
});
