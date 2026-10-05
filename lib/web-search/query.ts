function extractTopicQuery(raw: string): string | null {
  const trimmed = raw.trim();
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
    return whatIs[1].trim().replace(/\s+/g, " ");
  }

  const whoIs = trimmed.match(/\bwho\s+is\s+(.+?)(?:[.?!,]|$)/i);
  if (whoIs?.[1] && whoIs[1].length <= 120) {
    return whoIs[1].trim().replace(/\s+/g, " ");
  }

  return null;
}

function extractSubjectFromHistory(
  recentUserMessages: string[],
): string | null {
  for (let i = recentUserMessages.length - 1; i >= 0; i -= 1) {
    const topic = extractTopicQuery(recentUserMessages[i]);
    if (topic) return topic;

    const whoIs = recentUserMessages[i].match(
      /\bwho\s+is\s+(.+?)(?:[.?!,]|$)/i,
    );
    if (whoIs?.[1]) return whoIs[1].trim().replace(/\s+/g, " ");

    const whatIs = recentUserMessages[i].match(
      /\bwhat\s+is\s+(.+?)(?:[.?!,]|$)/i,
    );
    if (whatIs?.[1]) return whatIs[1].trim().replace(/\s+/g, " ");
  }
  return null;
}

function needsContextualRewrite(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  if (/\b(him|her|them|they|this person|that person)\b/.test(q)) return true;
  if (/^more\s+(info|information|details)\b/.test(q)) return true;
  if (/^(tell me )?more about\b/.test(q)) return true;
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
  const topic = extractTopicQuery(userQuery);
  if (topic) return topic.slice(0, 500);

  let q = userQuery.trim().replace(/\s+/g, " ");

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
      /\bto\s+get\s+(the\s+)?(latest|recent|up-to-date)\s+context\b/gi,
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
  recentUserMessages: string[] = [],
): string[] {
  const primary = resolveSearchQueryWithContext(userQuery, recentUserMessages);
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
