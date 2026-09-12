/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import mammoth from "mammoth";
import JSZip from "jszip";

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.name.split(".").pop()?.toLowerCase() ?? "";

  switch (fileType) {
    case "txt":
    case "md":
    case "markdown":
    case "json":
    case "csv":
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "java":
    case "go":
    case "rs":
    case "html":
    case "css":
    case "xml":
    case "yaml":
    case "yml":
      return readTextFile(file);
    case "pdf":
      return readPdfFile(file);
    case "docx":
    case "doc":
      return readDocxFile(file);
    case "pptx":
      return readPptxFile(file);
    case "xlsx":
    case "xls":
      return readXlsxFile(file);
    default:
      throw new Error(
        `Unsupported file type: .${fileType || "unknown"} — use PDF, DOCX, PPTX, XLSX, text, image, or video`,
      );
  }
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function readPdfFile(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  if (typeof window !== "undefined" && "Worker" in window) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return fullText.trim();
}

async function readDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function readPptxFile(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (slideFiles.length === 0) {
    throw new Error("No slides found in PPTX");
  }

  const parts: string[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const xml = await zip.files[slideFiles[i]].async("text");
    const texts = [...xml.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g)].map((m) =>
      decodeXmlEntities(m[1]),
    );
    const body = texts.join(" ").replace(/\s+/g, " ").trim();
    if (body) parts.push(`--- Slide ${i + 1} ---\n${body}`);
  }

  if (parts.length === 0) {
    throw new Error("PPTX contained no extractable text");
  }
  return parts.join("\n\n");
}

async function readXlsxFile(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const sharedXml = zip.files["xl/sharedStrings.xml"];
  const shared: string[] = [];
  if (sharedXml) {
    const xml = await sharedXml.async("text");
    const siBlocks = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];
    for (const block of siBlocks) {
      const texts = [...block.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) =>
        decodeXmlEntities(m[1]),
      );
      shared.push(texts.join(""));
    }
  }

  const sheetNames = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (sheetNames.length === 0) {
    throw new Error("No worksheets found in spreadsheet");
  }

  const parts: string[] = [];
  for (let i = 0; i < sheetNames.length; i++) {
    const xml = await zip.files[sheetNames[i]].async("text");
    const rows = xml.match(/<row[\s\S]*?<\/row>/g) ?? [];
    const rowLines: string[] = [];
    for (const row of rows) {
      const cells = [...row.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)];
      const values: string[] = [];
      for (const cell of cells) {
        const attrs = cell[1];
        const body = cell[2];
        const typeMatch = /\bt="([^"]+)"/.exec(attrs);
        const type = typeMatch?.[1];
        const vMatch = /<v>([^<]*)<\/v>/.exec(body);
        if (!vMatch) continue;
        const raw = vMatch[1];
        if (type === "s") {
          const idx = Number(raw);
          values.push(shared[idx] ?? raw);
        } else {
          values.push(raw);
        }
      }
      if (values.length) rowLines.push(values.join("\t"));
    }
    if (rowLines.length) {
      parts.push(`--- Sheet ${i + 1} ---\n${rowLines.join("\n")}`);
    }
  }

  if (parts.length === 0) {
    throw new Error("Spreadsheet contained no extractable cells");
  }
  return parts.join("\n\n");
}
