import type { WebSearchApiResult } from "@/lib/web-search/types";

export function formatWebSearchContextForModel(
  batches: WebSearchApiResult[],
  locale: "en" | "hi" = "en",
): string {
  if (batches.every((b) => b.results.length === 0)) {
    return locale === "hi"
      ? "वेब खोज से कोई परिणाम नहीं मिला। अपने ज्ञान का उपयोग करें और अस्पष्टता बताएं।"
      : "Web search returned no results. Answer from your knowledge and state uncertainty.";
  }

  const lines: string[] = [
    locale === "hi"
      ? "वेब खोज संदर्भ (नवीनतम जानकारी के लिए इन्हें प्राथमिकता दें, URL उद्धृत करें):"
      : "Web search context (prefer this for up-to-date facts; cite URLs):",
  ];

  for (const batch of batches) {
    if (!batch.query) continue;
    lines.push(`\nQuery: ${batch.query}`);
    batch.results.forEach((r, i) => {
      lines.push(
        `${i + 1}. ${r.title}\n   URL: ${r.href}\n   ${r.snippet ?? ""}`.trim(),
      );
    });
  }

  lines.push(
    locale === "hi"
      ? "\nउत्तर संक्षिप्त रखें। दावों के लिए स्रोत URL शामिल करें।"
      : "\nKeep the answer concise. Include source URLs for factual claims.",
  );

  return lines.join("\n");
}
