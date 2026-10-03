import { mergeWebSearchBatches } from "@/lib/web-search/merge";
import type { WebSearchApiResult } from "@/lib/web-search/types";

export function formatWebSearchContextForModel(
  batches: WebSearchApiResult[],
  options?: {
    locale?: "en" | "hi";
    userQuestion?: string;
  },
): string {
  const locale = options?.locale ?? "en";
  const userQuestion = options?.userQuestion?.trim();
  const sources = mergeWebSearchBatches(batches, 10);

  if (sources.length === 0) {
    return locale === "hi"
      ? "वेब खोज से कोई परिणाम नहीं मिला। अपने ज्ञान का उपयोग करें और अस्पष्टता बताएं।"
      : "Web search returned no results. Answer from your knowledge and state uncertainty.";
  }

  const lines: string[] = [];

  if (locale === "hi") {
    lines.push(
      "वेब खोज स्रोत (समय-संवेदनशील तथ्यों के लिए इन्हीं पर आधारित उत्तर दें):",
    );
    if (userQuestion) {
      lines.push(`उपयोगकर्ता का प्रश्न: ${userQuestion}`);
    }
    lines.push(
      "निर्देश: स्रोतों से तथ्य निकालें; हर महत्वपूर्ण दावे के साथ URL दें; स्रोतों में अंतर हो तो बताएं; स्निपेट/अंश में न हो तो अनुमान न लगाएं।",
    );
  } else {
    lines.push("Web search sources (ground time-sensitive answers in these):");
    if (userQuestion) {
      lines.push(`User question: ${userQuestion}`);
    }
    lines.push(
      "Instructions: Extract facts from the sources below; cite the URL for every important claim; note conflicts between sources; do not invent facts missing from snippets/excerpts.",
    );
  }

  sources.forEach((source, index) => {
    lines.push("");
    lines.push(`[${index + 1}] ${source.title} (${source.domain})`);
    lines.push(`URL: ${source.href}`);
    if (source.snippet?.trim()) {
      lines.push(`Search snippet: ${source.snippet.trim()}`);
    }
    if (source.pageExcerpt?.trim()) {
      lines.push(`Page excerpt: ${source.pageExcerpt.trim()}`);
    }
    if (!source.snippet?.trim() && !source.pageExcerpt?.trim()) {
      lines.push(
        locale === "hi"
          ? "सामग्री: (केवल शीर्षक/लिंक — सावधानी से उपयोग करें)"
          : "Content: (title/link only — use with caution)",
      );
    }
  });

  lines.push("");
  lines.push(
    locale === "hi"
      ? "अब उपयोगकर्ता के प्रश्न का सीधा, संरचित उत्तर दें।"
      : "Now answer the user question directly using the material above.",
  );

  return lines.join("\n");
}
