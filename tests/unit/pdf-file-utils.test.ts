/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import JSZip from "jszip";

const pdfMocks = vi.hoisted(() => ({
  destroy: vi.fn(),
  getPage: vi.fn(),
}));

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 1,
      getPage: pdfMocks.getPage,
      destroy: pdfMocks.destroy,
    }),
  }),
}));

import {
  extractOfficeImages,
  extractPdfContentWithModule,
} from "@/lib/file-utils";

describe("PDF text extraction", () => {
  beforeEach(() => {
    pdfMocks.destroy.mockReset();
    pdfMocks.getPage.mockReset();
  });

  it("extracts selectable text and releases PDF.js resources", async () => {
    const cleanup = vi.fn();
    pdfMocks.getPage.mockResolvedValue({
      getTextContent: async () => ({ items: [{ str: "Extracted PDF text" }] }),
      cleanup,
    });

    const result = await extractPdfContentWithModule(
      new File(["synthetic pdf bytes"], "notes.pdf"),
      pdfjs(),
    );
    expect(result.text).toContain("Extracted PDF text");
    expect(result.images).toEqual([]);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(pdfMocks.destroy).toHaveBeenCalledOnce();
  });

  it("renders image-only pages for vision analysis and releases resources", async () => {
    const render = vi.fn(() => ({ promise: Promise.resolve() }));
    const cleanup = vi.fn();
    pdfMocks.getPage.mockResolvedValue({
      getTextContent: async () => ({ items: [] }),
      getViewport: ({ scale }: { scale: number }) => ({
        width: 600 * scale,
        height: 800 * scale,
      }),
      render,
      cleanup,
    });
    vi.stubGlobal("document", {
      createElement: () => ({
        getContext: () => ({}),
        toDataURL: () => "data:image/jpeg;base64,c2Nhbm5lZA==",
        width: 0,
        height: 0,
      }),
    });

    const result = await extractPdfContentWithModule(
      new File(["synthetic pdf bytes"], "scan.pdf"),
      pdfjs(),
      1,
    );
    expect(result).toMatchObject({
      text: "",
      images: [
        expect.objectContaining({ pageNumber: 1, dataUrl: expect.any(String) }),
      ],
      skippedImagePages: [],
    });
    expect(render).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(pdfMocks.destroy).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

describe("embedded office images", () => {
  it("extracts slide media from a PPTX archive for vision processing", async () => {
    const zip = new JSZip();
    zip.file("ppt/media/image1.png", new Uint8Array([137, 80, 78, 71]));
    zip.file("ppt/slides/slide1.xml", "<p:sld />");
    const bytes = (await zip.generateAsync({ type: "uint8array" }))
      .buffer as ArrayBuffer;
    const pptx = new File([bytes], "slides.pptx");

    await expect(extractOfficeImages(pptx)).resolves.toEqual({
      images: [
        {
          name: "image1.png",
          type: "image/png",
          data: new Uint8Array([137, 80, 78, 71]),
        },
      ],
      omittedCount: 0,
    });
  });
});

function pdfjs() {
  return {
    GlobalWorkerOptions: { workerSrc: "" },
    getDocument: () => ({
      promise: Promise.resolve({
        numPages: 1,
        getPage: pdfMocks.getPage,
        destroy: pdfMocks.destroy,
      }),
    }),
  } as unknown as typeof import("pdfjs-dist");
}
