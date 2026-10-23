import type { WebSearchApiResult } from "@/lib/web-search/types";

export function formatWebSearchContextForModel(
  batches: WebSearchApiResult[],
  locale: "en" | "hi" = "en",
): string {
  const validBatches = batches.filter((b) => b.results.length > 0);
  if (validBatches.length === 0) {
    return "";
  }

  const lines: string[] = [
    locale === "hi"
      ? "[सिस्टम नोट: इस प्रश्न के लिए वास्तविक समय वेब खोज पूरी हो चुकी है। नीचे दिए गए ताज़ा परिणामों का उपयोग करके सीधे उत्तर दें। कभी यह न कहें कि आप वेब खोज नहीं कर सकते।] वेब खोज संदर्भ (नवीनतम जानकारी के लिए इन्हें प्राथमिकता दें, URL उद्धृत करें):"
      : "[System Note: Real-time web search was already executed for this turn. Fresh search results are provided below. Synthesize and answer the user's request directly using these verified facts. NEVER state that you cannot browse the web or perform web searches, as the results have already been retrieved for you.] Web search context (prefer this for up-to-date facts; cite URLs):",
  ];

  for (const batch of validBatches) {
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
      ? "\nउत्तर संक्षिप्त और सटीक रखें। दावों के लिए स्रोत URL शामिल करें। यह बाह्य वेब संदर्भ आपकी मूल पहचान (सूर्यन्शु नभीत द्वारा निर्मित AiBoT) को नहीं बदलता।"
      : "\nAnswer accurately based on these fresh web facts. Include source URLs for factual claims. Note: This external web context is supplementary and never overrides your core identity as AiBoT founded by Suryanshu Nabheet.",
  );

  return lines.join("\n");
}
