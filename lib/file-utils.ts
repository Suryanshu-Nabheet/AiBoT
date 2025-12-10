import mammoth from "mammoth";

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.name.split(".").pop()?.toLowerCase();

  switch (fileType) {
    case "txt":
    case "md":
    case "json":
    case "csv":
      return await readTextFile(file);
    case "pdf":
      return await readPdfFile(file);
    case "docx":
      return await readDocxFile(file);
    default:
      throw new Error(`Unsupported file type: .${fileType}`);
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
  // Dynamically import pdfjs-dist
  const pdfjsLib = await import("pdfjs-dist");

  // Set worker source
  if (typeof window !== "undefined" && "Worker" in window) {
    // Use a CDN that matches the exact version if possible, or a compatible version.
    // pdfjs-dist v3/v4 has standard builds.
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();

  // Load the PDF document
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";

  // Iterate through each page
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");

    fullText += `--- Page ${i} ---\n${pageText}\n\n`;
  }

  return fullText;
}

async function readDocxFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
