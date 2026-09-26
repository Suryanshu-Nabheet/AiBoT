/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  DOCUMENT_WORK_INSTRUCTION,
  isExplicitDocumentDeliverableRequest,
  isDocumentWorkRequest,
  messageStartsDocumentWork,
  splitDocumentResponse,
} from "@/lib/chat/document-work";
import { Role } from "@/lib/types";
import { buildChatSystemPrompt } from "@/lib/prompts";

describe("document work chat", () => {
  it("recognizes structured document requests in ordinary chat", () => {
    expect(isDocumentWorkRequest("Make study notes from this chapter")).toBe(
      true,
    );
    expect(isDocumentWorkRequest("Compare these spreadsheet sheets")).toBe(
      true,
    );
    expect(isDocumentWorkRequest("What time is it?")).toBe(false);
  });

  it("marks only explicit deliverable requests for the document card", () => {
    expect(
      isExplicitDocumentDeliverableRequest("Do research on this topic"),
    ).toBe(true);
    expect(
      isExplicitDocumentDeliverableRequest(
        "What does this attached report say?",
      ),
    ).toBe(false);
    expect(
      isExplicitDocumentDeliverableRequest("Rewrite the report with citations"),
    ).toBe(true);
  });

  it("treats uploaded content as document work", () => {
    expect(
      isDocumentWorkRequest("What are the key points?", [
        {
          id: "file-1",
          name: "paper.pdf",
          type: "application/pdf",
          kind: "document",
          content: "Research content",
        },
      ]),
    ).toBe(true);
  });

  it("tracks document context only from user messages", () => {
    expect(
      messageStartsDocumentWork({
        id: "user-1",
        role: Role.User,
        content: "Summarize this paper",
      }),
    ).toBe(true);
    expect(
      messageStartsDocumentWork({
        id: "assistant-1",
        role: Role.Agent,
        content: "Summary",
      }),
    ).toBe(false);
    expect(DOCUMENT_WORK_INSTRUCTION).toContain("Do not invent facts");
  });

  it("adds document guidance to the system prompt only for document work", () => {
    const prompt = buildChatSystemPrompt({
      modelId: "openrouter/free",
      documentWork: true,
    });
    const regularPrompt = buildChatSystemPrompt({ modelId: "openrouter/free" });

    expect(prompt).toContain(DOCUMENT_WORK_INSTRUCTION);
    expect(regularPrompt).not.toContain(DOCUMENT_WORK_INSTRUCTION);
  });

  it("splits a conversational response around only the requested deliverable", () => {
    expect(
      splitDocumentResponse(
        "Here is the research.\n\n[[DOCUMENT_ANALYSIS]]\n## Findings\nEvidence\n[[/DOCUMENT_ANALYSIS]]\n\nTaken together, this suggests a clear direction.",
      ),
    ).toEqual([
      { kind: "conversation", text: "Here is the research.\n\n" },
      { kind: "document", text: "\n## Findings\nEvidence\n" },
      {
        kind: "conversation",
        text: "\n\nTaken together, this suggests a clear direction.",
      },
    ]);
  });

  it("keeps ordinary responses outside the document card", () => {
    expect(splitDocumentResponse("The attached scan shows a receipt.")).toEqual(
      [{ kind: "conversation", text: "The attached scan shows a receipt." }],
    );
  });

  it("hides an incomplete boundary while a response is streaming", () => {
    expect(splitDocumentResponse("Intro\n[[DOCUMENT_")).toEqual([
      { kind: "conversation", text: "Intro\n" },
    ]);
    expect(
      splitDocumentResponse("Intro\n[[DOCUMENT_ANALYSIS]]\nDraft text"),
    ).toEqual([
      { kind: "conversation", text: "Intro\n" },
      { kind: "document", text: "\nDraft text", inProgress: true },
    ]);
  });
});
