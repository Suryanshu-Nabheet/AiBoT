import { describe, expect, it } from "vitest";
import {
  normalizeStoredMessages,
  normalizeWebSearchTrace,
} from "@/lib/chat/normalize-stored-messages";
import { Role } from "@/lib/types";

describe("normalizeWebSearchTrace", () => {
  it("finalizes interrupted running traces", () => {
    const trace = normalizeWebSearchTrace({
      status: "running",
      steps: [
        { kind: "summary", label: "Searching the web…" },
        {
          kind: "query",
          label: "Query",
          query: "bihar news",
          meta: "In progress",
        },
      ],
    });

    expect(trace?.status).toBe("complete");
    expect(trace?.steps[0]?.label).toBe("Web search (stopped)");
    expect(trace?.steps[1]?.meta).toBeUndefined();
  });
});

describe("normalizeStoredMessages", () => {
  it("drops empty assistant placeholders and normalizes roles", () => {
    const messages = normalizeStoredMessages([
      { role: "user", content: "hello" },
      { role: "assistant", content: "" },
      {
        role: "assistant",
        content: "answer",
        webSearchTrace: {
          status: "running",
          steps: [{ kind: "summary", label: "Searching the web…" }],
        },
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe(Role.User);
    expect(messages[1].webSearchTrace?.status).toBe("complete");
  });
});
