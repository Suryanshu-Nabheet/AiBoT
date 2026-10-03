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

  return null;
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
export function planWebSearchQueries(userQuery: string): string[] {
  const primary = normalizeUserQueryForSearch(userQuery);
  if (!primary) return [];

  const year = new Date().getFullYear();
  const wantsFresh =
    /\b(today|latest|current|now|recent|news|price|release|update|202[4-9]|this year)\b/i.test(
      userQuery,
    );

  const queries = [primary];
  if (wantsFresh) {
    const newsQuery = /\bnews\b/i.test(primary)
      ? primary
      : `${primary} news`.slice(0, 500);
    if (newsQuery !== primary) {
      queries.push(newsQuery);
    } else if (!primary.includes(String(year))) {
      queries.push(`${primary} ${year}`.slice(0, 500));
    }
  }

  return queries.slice(0, 2);
}
