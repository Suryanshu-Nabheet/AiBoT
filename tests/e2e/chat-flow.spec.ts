/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { test, expect } from "@playwright/test";
import JSZip from "jszip";
import { deflateSync } from "node:zlib";
import { mockChatStream } from "./helpers/mock-chat";

test.describe("Chat layout after first message", () => {
  test("composer moves to thread mode with user bubble", async ({ page }) => {
    await mockChatStream(page);
    await page.goto("/");

    const composer = page.getByPlaceholder(/message aibot/i);
    await composer.click();
    await page.keyboard.type("ping");
    const send = page.getByRole("button", { name: /send message/i });
    await expect(send).toBeEnabled({ timeout: 5_000 });
    await send.click();

    await expect(
      page.locator("main").getByText("ping", { exact: true }),
    ).toBeVisible({
      timeout: 15_000,
    });

    const recentChat = page
      .locator('[data-sidebar="menu-button"]')
      .filter({ hasText: "ping" })
      .first();
    if (!(await recentChat.isVisible())) {
      await page.getByRole("button", { name: /toggle sidebar/i }).click();
    }
    await expect(recentChat).toBeVisible();
    await expect(recentChat.locator("[title]")).toHaveCount(0);
    const recentChatBox = await recentChat.boundingBox();
    expect(recentChatBox?.height).toBeLessThanOrEqual(36);

    await expect(page.getByPlaceholder(/send follow-up/i)).toBeVisible();
    await expect(page.getByText(/what can i help you with today/i)).toHaveCount(
      0,
    );
  });

  test("keeps long user prompts on the right with readable left-aligned text", async ({
    page,
  }) => {
    await mockChatStream(page);
    await page.goto("/");

    const prompt = Array(18)
      .fill(
        "Please explain how the upload flow handles a long document and keeps the conversation context readable.",
      )
      .join(" ");
    await page.getByPlaceholder(/message aibot/i).fill(prompt);
    await page.getByRole("button", { name: /send message/i }).click();

    const promptText = page.getByText(prompt, { exact: true });
    await expect(promptText).toBeVisible();
    await expect
      .poll(() =>
        promptText.evaluate((element) => getComputedStyle(element).textAlign),
      )
      .toBe("left");

    const message = promptText.locator("..").locator("..");
    const [messageBox, rowBox] = await Promise.all([
      message.boundingBox(),
      message.locator("..").boundingBox(),
    ]);
    expect(messageBox && rowBox).toBeTruthy();
    if (messageBox && rowBox) {
      expect(
        Math.abs(rowBox.x + rowBox.width - (messageBox.x + messageBox.width)),
      ).toBeLessThan(2);
      expect(messageBox.width).toBeLessThanOrEqual(577);
    }
  });

  test("attaches a PDF through the browser PDF.js loader", async ({ page }) => {
    await page.goto("/");

    const pdf = makePdf(
      "BT /F1 18 Tf 72 720 Td (Webpack PDF upload works) Tj ET",
    );

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "webpack-upload.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });

    await expect(
      page.getByText("webpack-upload.pdf", { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("renders image-only PDF pages as image attachments", async ({
    page,
  }) => {
    await page.goto("/");
    const scannedPdf = makePdf(
      "0.2 w 72 700 m 540 700 l S 72 680 m 540 680 l S",
    );

    await page.locator('input[type="file"]').first().setInputFiles({
      name: "scanned-notes.pdf",
      mimeType: "application/pdf",
      buffer: scannedPdf,
    });

    await expect(
      page.getByRole("img", { name: "scanned-notes.pdf · page 1" }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("sends extracted Office text and image attachments to chat", async ({
    page,
  }) => {
    await page.goto("/");
    const response =
      "Here is the research synthesis.\n\n[[DOCUMENT_ANALYSIS]]\n## Key findings\nFiles received\n[[/DOCUMENT_ANALYSIS]]\n\nTaken together, these findings point to a consistent pattern.";
    let postedBody:
      | { messages: { content: unknown }[]; documentWork?: boolean }
      | undefined;
    await page.route("**/api/chat", async (route) => {
      postedBody = route.request().postDataJSON() as {
        messages: { content: unknown }[];
        documentWork?: boolean;
      };
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: response } }] })}\n\ndata: [DONE]\n\n`,
      });
    });

    const pixelPng = makeTinyPng();
    const docx = await makeDocxFixture(pixelPng);
    const pptx = await makePptxFixture();
    const xlsx = await makeXlsxFixture();
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles([
        {
          name: "notes.docx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          buffer: docx,
        },
        {
          name: "slides.pptx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          buffer: pptx,
        },
        {
          name: "data.xlsx",
          mimeType:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          buffer: xlsx,
        },
        { name: "pixel.png", mimeType: "image/png", buffer: pixelPng },
      ]);

    await expect(page.getByText("notes.docx", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("slides.pptx", { exact: true })).toBeVisible();
    await expect(page.getByText("data.xlsx", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "image1.jpg" })).toBeVisible();
    await expect(page.getByRole("img", { name: "pixel.jpg" })).toBeVisible();
    await page.getByPlaceholder(/message aibot/i).fill("Summarize these files");
    await page.getByRole("button", { name: /send message/i }).click();
    const documentCard = page.locator('[data-document-response="true"]');
    await expect(documentCard).toBeVisible({ timeout: 15_000 });
    await expect(documentCard.getByText("Key findings")).toBeVisible();
    await expect(documentCard.getByText("Files received")).toBeVisible();
    await expect(
      documentCard.getByText("Here is the research synthesis."),
    ).toHaveCount(0);
    await expect(
      documentCard.getByText(
        "Taken together, these findings point to a consistent pattern.",
      ),
    ).toHaveCount(0);
    await expect(
      page.getByText("Here is the research synthesis.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Taken together, these findings point to a consistent pattern.",
        { exact: true },
      ),
    ).toBeVisible();

    expect(postedBody).toBeDefined();
    const payload = JSON.stringify(postedBody ?? {});
    expect(payload).toContain("Word fixture text");
    expect(payload).toContain("Slide fixture text");
    expect(payload).toContain("Spreadsheet fixture text");
    expect(payload).toContain("image_url");
    expect(postedBody?.documentWork).toBe(true);
    await expect(
      page.getByRole("button", { name: "Listen to response" }),
    ).toBeVisible();
    const downloadButton = page.getByRole("button", {
      name: "Download as PDF",
    });
    await expect(downloadButton).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("document-analysis.pdf");
  });

  test("keeps a conversational answer about an attachment outside the card", async ({
    page,
  }) => {
    await page.goto("/");
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: "The scan shows a receipt dated Tuesday." } }] })}\n\ndata: [DONE]\n\n`,
      });
    });
    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({
        name: "receipt.pdf",
        mimeType: "application/pdf",
        buffer: makePdf("BT /F1 18 Tf 72 720 Td (Receipt) Tj ET"),
      });
    await expect(page.getByText("receipt.pdf", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByPlaceholder(/message aibot/i)
      .fill("What does this scan show?");
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(
      page.getByText("The scan shows a receipt dated Tuesday.", {
        exact: true,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-document-response="true"]')).toHaveCount(
      0,
    );
  });

  test("uses the document card for explicit research requests without model markers", async ({
    page,
  }) => {
    await page.goto("/");
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: `data: ${JSON.stringify({ choices: [{ delta: { content: "## Research brief\n\nFinding one: the sample is growing." } }] })}\n\ndata: [DONE]\n\n`,
      });
    });
    await page
      .getByPlaceholder(/message aibot/i)
      .fill("Do research on these sample figures and make a research brief");
    await page.getByRole("button", { name: /send message/i }).click();

    const documentCard = page.locator('[data-document-response="true"]');
    await expect(documentCard).toBeVisible({ timeout: 15_000 });
    await expect(documentCard.getByText("Research brief")).toBeVisible();
    await expect(
      documentCard.getByText("Finding one: the sample is growing."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Download as PDF" }),
    ).toBeVisible();
  });
});

function makePdf(content: string) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];
  let length = Buffer.byteLength(chunks[0]);
  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const chunk = `${index + 1} 0 obj\n${object}\nendobj\n`;
    chunks.push(chunk);
    length += Buffer.byteLength(chunk);
  }
  const xrefOffset = length;
  chunks.push(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`);
  chunks.push(
    offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
      .join(""),
  );
  chunks.push(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );
  return Buffer.from(chunks.join(""));
}

async function makeDocxFixture(png: Buffer) {
  const zip = new JSZip();
  zip.file(
    "_rels/.rels",
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  );
  zip.file(
    "word/document.xml",
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Word fixture text</w:t></w:r></w:p></w:body></w:document>',
  );
  zip.file("word/media/image1.png", png);
  return zip.generateAsync({ type: "nodebuffer" });
}

async function makePptxFixture() {
  const zip = new JSZip();
  zip.file(
    "ppt/slides/slide1.xml",
    '<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>Slide fixture text</a:t></p:sld>',
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

async function makeXlsxFixture() {
  const zip = new JSZip();
  zip.file(
    "xl/sharedStrings.xml",
    '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Spreadsheet fixture text</t></si></sst>',
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData></worksheet>',
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

function makeTinyPng() {
  const chunk = (type: string, data: Buffer) => {
    const typeBytes = Buffer.from(type);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const checksum = Buffer.alloc(4);
    checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
    return Buffer.concat([length, typeBytes, data, checksum]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0, 255]))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
