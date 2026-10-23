import { extractCleanSearchQueries } from "./intent";

function extractTopicQuery(raw: string): string | null {
  let trimmed = raw.trim();

  // Guard against assistant self-identity lookups
  if (
    /\b(?:who\s+is\s+your\s+founder|who\s+created\s+you|who\s+made\s+you|who\s+built\s+you|who\s+is\s+aibot)\b/i.test(
      trimmed,
    )
  ) {
    return null;
  }

  // Strip leading conversational conjunctions (e.g. "and who is", "so what is")
  trimmed = trimmed.replace(
    /^(?:and|so|also|then|but|now|well|okay|ok|hey|actually)\s+/i,
    "",
  );

  const newsOf = trimmed.match(
    /\b(?:latest|recent|current|today'?s?)\s+news\s+(?:of|in|about|from)\s+(.+?)(?:[.?!,]|$)/i,
  );
  if (newsOf?.[1]) {
    return `latest news ${newsOf[1].trim()}`.replace(/\s+/g, " ");
  }

  const giveNews = trimmed.match(
    /\bgive\s+(?:me\s+)?(?:the\s+)?(?:latest|recent)\s+news\s+(?:of|in|about|from)\s+(.+?)(?:[.?!,]|$)/i,
  );
  if (giveNews?.[1]) {
    return `latest news ${giveNews[1].trim()}`.replace(/\s+/g, " ");
  }

  const whatIs = trimmed.match(/\bwhat\s+is\s+(.+?)(?:[.?!,]|$)/i);
  if (whatIs?.[1] && whatIs[1].length <= 120) {
    return `what is ${whatIs[1].trim()}`.replace(/\s+/g, " ");
  }

  const whoIs = trimmed.match(/\bwho\s+is\s+(.+?)(?:[.?!,]|$)/i);
  if (whoIs?.[1] && whoIs[1].length <= 120) {
    return `who is ${whoIs[1].trim()}`.replace(/\s+/g, " ");
  }

  return null;
}

function extractSubjectFromHistory(
  recentUserMessages: string[],
): string | null {
  for (let i = recentUserMessages.length - 1; i >= 0; i -= 1) {
    const msg = recentUserMessages[i];
    const whoIs = msg.match(/\bwho\s+is\s+(.+?)(?:[.?!,]|$)/i);
    if (whoIs?.[1]) return whoIs[1].trim().replace(/\s+/g, " ");

    const whatIs = msg.match(/\bwhat\s+is\s+(.+?)(?:[.?!,]|$)/i);
    if (whatIs?.[1]) return whatIs[1].trim().replace(/\s+/g, " ");

    const topic = extractTopicQuery(msg);
    if (topic) return topic;
  }
  return null;
}

function needsContextualRewrite(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (/\b(him|her|them|they|this person|that person)\b/.test(q)) return true;
  if (/^more\s+(info|information|details)\b/.test(q)) return true;
  if (/^(tell me )?more about\b/.test(q)) return true;
  if (/^(?:to\s+get\s+)?more\s+context\b/.test(q)) return true;
  if (/^(?:context|more\s+context|information|more\s+info|details|more\s+details)$/.test(q)) return true;
  return false;
}

/** Rewrite vague follow-ups ("more about him") using recent user turns. */
export function resolveSearchQueryWithContext(
  userQuery: string,
  recentUserMessages: string[] = [],
): string {
  const normalized = normalizeUserQueryForSearch(userQuery);
  if (!needsContextualRewrite(normalized)) return normalized;

  const subject = extractSubjectFromHistory(recentUserMessages);
  if (!subject) return normalized;

  if (/^more\s+(info|information|details)\b/i.test(normalized)) {
    return subject.slice(0, 500);
  }

  const rewritten = normalized
    .replace(/\b(him|her|them|they|this person|that person)\b/gi, subject)
    .replace(/\s+/g, " ")
    .trim();

  return rewritten.slice(0, 500);
}

/** Strip chat instructions so search queries stay focused on the topic. */
export function normalizeUserQueryForSearch(userQuery: string): string {
  let q = userQuery.trim().replace(/\s+/g, " ");

  q = q.replace(
    /\b(?:your\s+founder|the\s+founder\s+of\s+aibot|aibot'?s?\s+founder|your\s+creator|creator\s+of\s+aibot)\b/gi,
    "Suryanshu Nabheet",
  );

  const topic = extractTopicQuery(q);
  if (topic) return topic.slice(0, 500);

  q = q
    .replace(/^(?:and|so|also|then|but|now|well|okay|ok|hey|actually)\s+/gi, "")
    .replace(
      /^(?:can\s+you\s+(?:please\s+)?(?:tell\s+me|find|show\s+me|give\s+me|search|look\s+up)?|could\s+you\s+(?:please\s+)?(?:tell\s+me|find|show\s+me|give\s+me|search|look\s+up)?|please\s+(?:tell\s+me|find|show\s+me|give\s+me|search|look\s+up)?|tell\s+me\s+(?:about|what\s+is|who\s+is)?|find\s+(?:out\s+)?(?:more\s+)?(?:info|information|details|context)?\s*(?:of|about|on)?|i\s+(?:want|need)\s+to\s+know|do\s+you\s+know|what\s+about|how\s+about)\s+/gi,
      "",
    )
    .replace(/^(?:and|so|also|then|but|now|well|okay|ok|hey)\s+/gi, "");

  q = q
    .replace(
      /\b(do|run|perform|please)\s+(a\s+)?(web\s*search|websearch)\b/gi,
      "",
    )
    .replace(/\bsearch\s+the\s+web\s+(?:and\s+)?(?:then\s+)?/gi, "")
    .replace(/\band\s+then\s+give\s+(?:me\s+)?(?:the\s+)?/gi, "")
    .replace(/\bgive\s+(?:me\s+)?(?:the\s+)?/gi, "")
    .replace(/\bsearch\s+the\s+web\s+for\b/gi, "")
    .replace(
      /\b(?:to\s+(?:get|find|see|learn)|and\s+(?:get|find|see|learn)|for|about)\s+(?:the\s+)?(?:more\s+|latest\s+|recent\s+|up-to-date\s+)?(?:context|information|info|details|updates?|data|facts?)\b/gi,
      "",
    )
    .replace(/\b(get\s+)?(latest|recent|up-to-date)\s+context\b/gi, "")
    .replace(/\bfor\s+me\b/gi, "")
    .replace(/\bgive\s+with\b/gi, "with")
    .trim();

  q = q
    .replace(/\s*,\s*(to|and)\s*$/i, "")
    .replace(/^[,.\s;:]+|[,.\s;:]+$/g, "")
    .replace(/\s{2,}/g, " ");

  const firstSentence = q.split(/[.?!]/)[0]?.trim() ?? q;
  if (
    firstSentence.length >= 8 &&
    firstSentence.length <= 180 &&
    firstSentence.length < q.length * 0.9
  ) {
    q = firstSentence;
  }

  return q.slice(0, 500);
}

/** Derive 1–2 keyless search queries from the user message (no LLM). */
export function planWebSearchQueries(
  userQuery: string,
  history: (string | { role?: string; content?: unknown })[] = [],
): string[] {
  const planned = extractCleanSearchQueries(userQuery, history);
  if (planned.length > 0) return planned;

  const userMessages = history.map((h) =>
    typeof h === "string" ? h : String((h as { content?: unknown })?.content ?? ""),
  );
  const primary = resolveSearchQueryWithContext(userQuery, userMessages);
  if (!primary) return [];

  const year = new Date().getFullYear();
  const wantsFresh =
    /\b(today|latest|current|now|recent|news|price|release|update|202[4-9]|this year)\b/i.test(
      userQuery,
    );

  const queries = [primary];
  if (wantsFresh && !primary.includes(String(year))) {
    queries.push(`${primary} ${year}`.slice(0, 500));
  }

  return queries.slice(0, 2);
}

export {
  evaluateWebSearchIntent,
  extractCleanSearchQueries,
  isWebSearchRequestedOrNeeded,
  type SearchIntentReason,
  type SearchIntentResult,
} from "./intent";

