/** True when the model's user-safe plan explicitly calls for fresh web evidence. */
export function thinkingPlanRequestsResearch(
  plan: string,
  userQuery = "",
): boolean {
  const text = plan.replace(/\s+/g, " ").trim();
  if (!text) return false;

  const requestsResearch =
    /\b(?:web search|search (?:the )?(?:web|internet)|browse (?:the )?(?:web|internet)|online research)\b/i.test(
      text,
    ) ||
    /\b(?:search|browse|look up|check|verify|research|find)\b.{0,90}\b(?:online|latest|current|recent|up[- ]to[- ]date|official|release notes|documentation|docs|sources|today|live|real[- ]time)\b/i.test(
      text,
    ) ||
    /\b(?:latest|current|recent|up[- ]to[- ]date|live|real[- ]time)\b.{0,90}\b(?:sources|data|prices|news|documentation|docs|release notes)\b/i.test(
      text,
    );
  if (!requestsResearch) return false;

  const normalizeTerm = (term: string) =>
    term.toLowerCase().replace(/(?:ing|ed|es|s)$/, "");
  const stopwords = new Set([
    "about",
    "after",
    "also",
    "and",
    "before",
    "check",
    "compare",
    "current",
    "official",
    "release",
    "source",
    "the",
    "their",
    "these",
    "they",
    "this",
    "those",
    "tool",
    "verify",
    "with",
  ]);
  const queryTerms = new Set(
    (userQuery.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [])
      .map(normalizeTerm)
      .filter((term) => !stopwords.has(term)),
  );
  const planTerms = new Set(
    (text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).map(normalizeTerm),
  );
  const hasTopicOverlap = [...queryTerms].some((term) => planTerms.has(term));
  const referencesCurrentTask =
    /\b(?:these|those|the requested)\s+(?:tools|options|products|frameworks|models|approaches|items|sources|details)\b|\bthis\s+(?:request|question|topic|comparison)\b/i.test(
      text,
    );
  return hasTopicOverlap || (queryTerms.size > 0 && referencesCurrentTask);
}
