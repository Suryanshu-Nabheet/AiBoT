/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import { processFilesForChat } from "@/lib/chat/process-files";
import { ATTACHMENT_LIMITS } from "@/lib/chat/attachments";

describe("processFilesForChat", () => {
  it("extracts supported text files into chat attachments", async () => {
    const result = await processFilesForChat([
      new File(["Useful notes"], "notes.txt", { type: "text/plain" }),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.attachments).toHaveLength(1);
    expect(result.attachments[0]).toMatchObject({
      name: "notes.txt",
      kind: "text",
      content: "Useful notes",
    });
  });

  it("extracts text MIME files even when their extension is unfamiliar", async () => {
    const result = await processFilesForChat([
      new File(["Build output"], "server-output.log", { type: "text/plain" }),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.attachments[0]).toMatchObject({
      name: "server-output.log",
      kind: "text",
      content: "Build output",
    });
  });

  it("reports empty files without aborting the remaining selection", async () => {
    const result = await processFilesForChat([
      new File([], "empty.txt"),
      new File(["kept"], "kept.txt"),
    ]);

    expect(result.attachments.map(({ name }) => name)).toEqual(["kept.txt"]);
    expect(result.errors).toEqual(["empty.txt is empty"]);
  });

  it("honors attachment slots already used by the chat", async () => {
    const existing = Array.from(
      { length: ATTACHMENT_LIMITS.maxFiles },
      (_, i) => ({
        id: `existing-${i}`,
        name: `existing-${i}.txt`,
        type: "text/plain",
        kind: "text" as const,
        content: "existing",
      }),
    );

    const result = await processFilesForChat(
      [new File(["new"], "new.txt")],
      existing,
    );

    expect(result.attachments).toEqual([]);
    expect(result.errors).toEqual([
      `You can attach up to ${ATTACHMENT_LIMITS.maxFiles} items`,
    ]);
  });

  it("reports unsupported legacy Word files clearly", async () => {
    const result = await processFilesForChat([
      new File(["data"], "legacy.doc"),
    ]);

    expect(result.attachments).toEqual([]);
    expect(result.errors[0]).toContain("Save the file as .docx");
  });

  it("rejects unknown binary formats instead of decoding them as gibberish", async () => {
    const result = await processFilesForChat([
      new File([new Uint8Array([0, 159, 146, 150])], "archive.bin"),
    ]);

    expect(result.attachments).toEqual([]);
    expect(result.errors[0]).toContain("Unsupported file type");
  });
});
