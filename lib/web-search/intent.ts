/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export type SearchIntentReason =
  | "explicit_request"
  | "freshness_signal"
  | "realtime_data"
  | "factual_lookup"
  | "skip_self_identity"
  | "skip_conversational"
  | "skip_basic_math"
  | "skip_basic_code"
  | "skip_chitchat"
  | "skip_creative"
  | "skip_general_knowledge"
  | "skip_empty";

export type SearchIntentResult = {
  shouldSearch: boolean;
  reason: SearchIntentReason;
  confidence: number;
  queries: string[];
};

export type HistoryMessage =
  | string
  | {
      role?: string;
      content?: unknown;
    };

/** Self-identity, founder, creator, architecture, or origin questions for AiBoT. */
const ASSISTANT_SELF_IDENTITY_REGEX =
  /\b(?:who\s+(?:are\s+you|created\s+you|made\s+you|built\s+you|developed\s+you|designed\s+you|owns\s+you|runs\s+you|programmed\s+you|founded\s+you)|who\s+is\s+your\s+(?:founder|creator|maker|developer|author|architect|owner|parent|boss)|who\s+(?:founded|created|built|made|owns|developed|designed)\s+aibot|who\s+is\s+(?:the\s+)?(?:founder|creator|developer|author|maker|architect|owner)\s+of\s+aibot|what\s+is\s+your\s+name|what\s+are\s+you|tell\s+me\s+about\s+(?:yourself|your\s+origins?|your\s+founder|your\s+creator)|what\s+is\s+aibot|who\s+is\s+aibot)\b/i;

/** Conversational follow-ups, assistant-directed queries, and elaboration requests. */
const ASSISTANT_CONVERSATIONAL_REGEX =
  /^\s*(?:can\s+you\s+(?:help|write|explain|tell|code|fix|summarize|translate|rewrite|show|do|give|solve|debug)|could\s+you\s+(?:help|write|explain|tell|code|fix|summarize|translate|rewrite|show|do|give|solve|debug)|do\s+you\s+(?:know|think|have|like|prefer|understand)|what\s+do\s+you\s+think|how\s+do\s+you\s+(?:work|think|feel)|are\s+you\s+(?:an?\s+ai|real|human|alive|smart)|go\s+(?:even\s+)?deeper|explain\s+(?:that|this)\s+(?:further|more|better)|give\s+(?:me\s+)?an?\s+example|elaborate(?:\s+on\s+that)?|continue|tell\s+me\s+more)\b/i;

/** Phrases where the user explicitly requests web search or online browsing. */
const EXPLICIT_SEARCH_REGEX =
  /\b(search\s+(the\s+)?(web|internet)|search\s+online|google\s+(it|this|that|something|search)|google\s+this\s+for\s+me|can\s+you\s+google|browse\s+the\s+web|look\s+up\s+online|look\s+online|check\s+online|find\s+on\s+(the\s+)?(web|internet)|web\s*search)\b/i;

/** Pure meta-search queries where the prompt itself has no content other than the directive to search. */
const PURE_SEARCH_COMMAND_REGEX =
  /^\s*(?:please\s+)?(?:can\s+you\s+)?(?:do\s+|run\s+|perform\s+|make\s+)?(?:a\s+)?(?:web\s*search|google|search(?:\s+the\s+)?(?:web|online|internet)?|look\s+it\s+up|check\s+online|find\s+out|verify\s+(?:this|online)|search\s+for\s+(?:it|this|more))\s*[!.?]*$/i;

/** Meta-search directives asking to search the web for the ongoing context/topic. */
const META_SEARCH_DIRECTIVE_REGEX =
  /^\s*(?:please\s+)?(?:can\s+you\s+)?(?:do\s+|run\s+|perform\s+|make\s+)?(?:a\s+)?(?:web\s*search|google|search(?:\s+the\s+)?(?:web|online|internet)?|look\s+(?:it\s+)?up(?:\s+online)?|check\s+online|find\s+out|verify\s+(?:this|online)|search\s+for\s+(?:it|this|more))\s*(?:to\s+(?:get|find|see|learn)|for|about|on)?\s*(?:the\s+)?(?:more\s+|latest\s+|recent\s+|up-to-date\s+)?(?:context|info|information|details|updates?|data|facts?)?\s*[!.?]*$/i;

/** Strong real-time, freshness, and temporal keywords. */
const FRESHNESS_KEYWORDS_REGEX =
  /\b(today'?s?|yesterday|tomorrow|this\s+(week|month|year)|latest|recent|currently|current|now|newest|breaking\s+news|just\s+announced|released?|roadmap|schedule\s+for|in\s+theaters|box\s*office|202[4-9]|2030)\b/i;

/** Live, dynamic, or market data indicators. */
const REALTIME_DATA_REGEX =
  /\b(stock\s*price|crypto\s*price|bitcoin\s*price|market\s*cap|weather\s+in|forecast\s+for|sports?\s*score|game\s*score|who\s+won|election\s+results|poll\s+numbers|inflation\s+rate|exchange\s+rate|currency\s+rate|flight\s+status|earthquake|traffic\s+in)\b/i;

/** Rapidly-evolving tech models, frameworks, and products that frequently change. */
const FAST_MOVING_ENTITIES_REGEX =
  /\b(deepseek|sora|gpt-4o|claude\s*3\.[57]|gemma\s*4|gemini\s*2|llama\s*3\.[123]|next\.?js\s*15|react\s*19|tailwind\s*v?4|blackwell|nemotron)\b/i;

/** Basic math, arithmetic, and elementary calculations. */
const BASIC_MATH_REGEX =
  /^\s*(?:what\s+is\s+|calculate\s+|solve\s+|compute\s+|evaluate\s+)?-?\d+(?:\.\d+)?\s*[\+\-\*\/\^%×÷]\s*-?\d+(?:\.\d+)?(?:\s*[\+\-\*\/\^%×÷]\s*-?\d+(?:\.\d+)?)*\s*\??\s*$/i;

const ALGEBRA_CALCULUS_REGEX =
  /\b(?:derivative|integral|antiderivative)\s+of\b|^\s*solve\s+[-+*\/0-9a-z\s^()=]+\??\s*$/i;

/** Greetings, small talk, and conversational openers. */
const GREETINGS_ONLY_REGEX =
  /^\s*(?:hi(?:\s+there)?|hello(?:\s+there)?|hey(?:\s+there)?|greetings|good\s+(?:morning|afternoon|evening|day)|howdy|sup|yo|how\s+are\s+you|who\s+are\s+you|what\s+is\s+your\s+name|what\s+can\s+you\s+do|thank\s+you(?:\s+so\s+much)?|thanks(?:\s+a\s+lot)?|ok|okay|bye|goodbye)\s*[!.?]*\s*$/i;

/** Creative writing, poems, stories, jokes, and roleplay requests. */
const CREATIVE_WRITING_REGEX =
  /\b(?:write|compose|create|generate|tell\s+me)\s+(?:a|an)?\s*(?:[a-z0-9_-]+\s+){0,3}(?:poem|story|haiku|joke|pun|riddle|limerick|song|lyrics|essay|speech|greeting\s*card|bedtime\s*story)\b/i;

/** Standard programming tasks and algorithmic implementations without version/temporal needs. */
const BASIC_CODE_TASK_REGEX =
  /\b(?:write|create|implement|give\s+me|show\s+me|code|how\s+to\s+implement|how\s+to\s+write|how\s+to\s+code|how\s+to\s+center|how\s+to\s+use|how\s+to\s+style|explain\s+how|difference\s+between|fix\s+this|debug|optimize)\s+(?:a|an)?\s*(?:python|javascript|typescript|js|ts|java|c\+\+|rust|go|sql|c#|ruby|php|html|css|react|vue|angular|node|express|nextjs|tailwind)?\s*(?:function|script|algorithm|method|code|snippet|regex|component|class|hook|query|page|layout|api|closure|promise|async|await|flexbox|grid|loop|array|object|map|set|interface|type)?\b/i;

/** Universal static knowledge, historical events, scientific definitions with unchanging facts. */
const STATIC_SCIENCE_REGEX =
  /\b(?:why\s+is\s+the\s+sky\s+blue|explain\s+photosynthesis|properties\s+of\s+(?:a\s+)?triangle|what\s+is\s+(?:gravity|mitosis|osmosis|dna|rna|an\s+atom|quantum\s+entanglement|the\s+speed\s+of\s+light|entropy|thermodynamics)|how\s+do\s+airplanes\s+fly|theory\s+of\s+relativity|who\s+was\s+(?:albert\s+einstein|isaac\s+newton|william\s+shakespeare|abraham\s+lincoln|leonardo\s+da\s+vinci|george\s+washington|aristotle|plato)|capital\s+of\s+[a-z]+)\b/i;

/**
 * Evaluates whether a query genuinely requires real-time web search.
 * Protects against wasteful/embarrassing searches for 2+2 or basic coding,
 * while ensuring live news, market data, and user search requests are fulfilled.
 */
export function evaluateWebSearchIntent(
  userQuery: string,
  options?: {
    conversationHistory?: HistoryMessage[];
    recentUserMessages?: string[];
    force?: boolean;
  },
): SearchIntentResult {
  const trimmed = userQuery.trim();
  if (!trimmed) {
    return {
      shouldSearch: false,
      reason: "skip_empty",
      confidence: 1.0,
      queries: [],
    };
  }

  const history = options?.conversationHistory ?? options?.recentUserMessages ?? [];

  const hasExplicitSearchRequest =
    EXPLICIT_SEARCH_REGEX.test(trimmed) ||
    PURE_SEARCH_COMMAND_REGEX.test(trimmed) ||
    META_SEARCH_DIRECTIVE_REGEX.test(trimmed);

  // 1. Forced search or explicit search request by the user in their prompt
  if (options?.force || hasExplicitSearchRequest) {
    const planned = extractCleanSearchQueries(trimmed, history);
    return {
      shouldSearch: true,
      reason: "explicit_request",
      confidence: 1.0,
      queries: planned.length > 0 ? planned : [trimmed.slice(0, 500)],
    };
  }

  // 2. Assistant self-identity, founder, creator, or origins (without explicit search command).
  // The system prompt already authoritatively defines AiBoT and its founder (Suryanshu Nabheet).
  // Under NO circumstances should public search engines be queried for "who is your founder" or "who are you".
  if (ASSISTANT_SELF_IDENTITY_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      reason: "skip_self_identity",
      confidence: 1.0,
      queries: [],
    };
  }

  // 4. Negative classification checks: Things that MUST NOT trigger web search
  // Math & Arithmetic
  if (BASIC_MATH_REGEX.test(trimmed) || ALGEBRA_CALCULUS_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      reason: "skip_basic_math",
      confidence: 0.98,
      queries: [],
    };
  }

  // Pure Greetings & Small Talk
  if (GREETINGS_ONLY_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      reason: "skip_chitchat",
      confidence: 0.95,
      queries: [],
    };
  }

  // Conversational questions directed at the assistant or requests to elaborate / continue
  if (
    ASSISTANT_CONVERSATIONAL_REGEX.test(trimmed) &&
    !FRESHNESS_KEYWORDS_REGEX.test(trimmed)
  ) {
    return {
      shouldSearch: false,
      reason: "skip_conversational",
      confidence: 0.94,
      queries: [],
    };
  }

  // Creative writing requests without temporal/news anchors
  if (CREATIVE_WRITING_REGEX.test(trimmed) && !FRESHNESS_KEYWORDS_REGEX.test(trimmed)) {
    return {
      shouldSearch: false,
      reason: "skip_creative",
      confidence: 0.92,
      queries: [],
    };
  }

  // Standard coding/algorithm problems without freshness
  if (
    BASIC_CODE_TASK_REGEX.test(trimmed) &&
    !FRESHNESS_KEYWORDS_REGEX.test(trimmed) &&
    !FAST_MOVING_ENTITIES_REGEX.test(trimmed)
  ) {
    return {
      shouldSearch: false,
      reason: "skip_basic_code",
      confidence: 0.94,
      queries: [],
    };
  }

  // Static universal science/history explanations
  if (
    STATIC_SCIENCE_REGEX.test(trimmed) &&
    !FRESHNESS_KEYWORDS_REGEX.test(trimmed)
  ) {
    return {
      shouldSearch: false,
      reason: "skip_general_knowledge",
      confidence: 0.9,
      queries: [],
    };
  }

  // 5. Positive classification checks: Real-time, market, fresh, or fast-moving topics
  const hasFreshness = FRESHNESS_KEYWORDS_REGEX.test(trimmed);
  const hasRealtimeData = REALTIME_DATA_REGEX.test(trimmed);
  const hasFastMoving = FAST_MOVING_ENTITIES_REGEX.test(trimmed);

  if (hasRealtimeData) {
    const planned = extractCleanSearchQueries(trimmed, history);
    return {
      shouldSearch: true,
      reason: "realtime_data",
      confidence: 0.95,
      queries: planned,
    };
  }

  if (hasFreshness || hasFastMoving) {
    const planned = extractCleanSearchQueries(trimmed, history);
    return {
      shouldSearch: true,
      reason: "freshness_signal",
      confidence: 0.9,
      queries: planned,
    };
  }

  // 6. Short questions checking external third-party entity facts
  const isDefinitionalOrStatus =
    /^(?:who\s+is|what\s+is|where\s+is|when\s+is)\b/i.test(trimmed) &&
    trimmed.length <= 120 &&
    !BASIC_MATH_REGEX.test(trimmed) &&
    !STATIC_SCIENCE_REGEX.test(trimmed) &&
    !ASSISTANT_SELF_IDENTITY_REGEX.test(trimmed);

  if (isDefinitionalOrStatus) {
    const planned = extractCleanSearchQueries(trimmed, history);
    if (planned.length > 0) {
      return {
        shouldSearch: true,
        reason: "factual_lookup",
        confidence: 0.75,
        queries: planned,
      };
    }
  }

  // 7. Fallthrough: Do NOT search the web for general knowledge or conversational turns.
  // The web search toggle gives the model live search capability, but does not blindly search every turn.
  return {
    shouldSearch: false,
    reason: "skip_general_knowledge",
    confidence: 0.85,
    queries: [],
  };
}

/**
 * Extracts the primary discussion subject from conversation history.
 * Seamlessly inspects headers, entities, and previous user turns.
 */
export function extractSubjectFromConversationHistory(
  history: HistoryMessage[] = [],
): string | null {
  if (!history || history.length === 0) return null;

  for (let i = history.length - 1; i >= 0; i -= 1) {
    const item = history[i];
    const text =
      typeof item === "string"
        ? item
        : typeof item?.content === "string"
          ? item.content
          : Array.isArray(item?.content)
            ? (item.content as { text?: string }[])
                .map((p) => p?.text ?? "")
                .join(" ")
            : "";

    if (!text.trim()) continue;

    const cleaned = text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/!\[.*?\]\(.*?\)/g, "")
      .replace(/\[.*?\]\((.*?)\)/g, "$1")
      .trim();

    // 1. Look for explicit founder/creator/author attributions in the text
    // e.g. "My founder and creator is Suryanshu Nabheet", "built by Suryanshu Nabheet"
    const attributionMatch = cleaned.match(
      /\b(?:founder(?:\s+and\s+creator)?|creator|developer|author|architect|built\s+by|founded\s+by)\s*[,:\s]+(?:is\s+|was\s+|:\s*|-+\s*)?\*{0,2}([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,3})\*{0,2}/i,
    );
    if (attributionMatch?.[1]) {
      const candidate = attributionMatch[1].trim();
      if (!/^(AiBoT|Assistant|OpenAI|Google|Anthropic)$/i.test(candidate)) {
        return candidate;
      }
    }

    const typingInMatch = cleaned.match(
      /typing\s+in\s+["']?([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){1,3})["']?/i,
    );
    if (typingInMatch?.[1]) {
      return typingInMatch[1].trim();
    }

    // 2. Check for Markdown headers (e.g. "### SpaceX and xAI Merger")
    const headerMatch = cleaned.match(/^#{1,3}\s+([^.\n]{3,80})/m);
    if (headerMatch?.[1]) {
      const candidate = headerMatch[1].replace(/[:*#_]+/g, "").trim();
      if (candidate.length >= 4 && !/clarification|status|note|warning|aibot/i.test(candidate)) {
        return candidate.slice(0, 80);
      }
    }

    // 3. Check for bolded entities: e.g. **SpaceX** or **Suryanshu Nabheet**
    const boldMatches = Array.from(cleaned.matchAll(/\*\*([A-Z0-9][a-zA-Z0-9\s._-]{2,40})\*\*/g));
    if (boldMatches.length > 0) {
      const entities = boldMatches
        .map((m) => m[1].trim())
        .filter(
          (e) =>
            !/important|clarification|note|status|warning|merger|acquisition|aibot|assistant/i.test(e) &&
            !/^(your|my)\s+/i.test(e),
        );
      if (entities.length > 0) {
        return entities[0].slice(0, 80);
      }
    }

    // 4. Check for named company/person entities (e.g. Suryanshu Nabheet, SpaceX, xAI, Elon Musk, Tesla, Sam Altman, OpenAI)
    const entityMatches = cleaned.match(/\b([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+){0,2}|xAI|SpaceX|OpenAI|DeepSeek)\b/g);
    if (entityMatches && entityMatches.length > 0) {
      const filtered = entityMatches.filter(
        (e) =>
          !/^(I|The|This|That|There|Here|However|If|When|Why|What|Who|Where|Although|Because|Therefore|AiBoT|Status|Disabled|How|Hello|Hey|Good|My|Your|Google|Bing|Search|Engine|Internet|Web|Browser)$/i.test(
            e,
          ),
      );
      if (filtered.length > 0) {
        const multiWordPerson = filtered.find((e) => e.includes(" "));
        if (multiWordPerson) {
          return multiWordPerson.slice(0, 80);
        }
        const unique = Array.from(new Set(filtered)).slice(0, 3);
        const topicWord = cleaned.match(/\b(merger|acquisition|deals?|stock|revenue|launch|features?|release|updates?)\b/i);
        const subject = topicWord ? `${unique.join(" ")} ${topicWord[1]}` : unique.join(" ");
        return subject.slice(0, 80);
      }
    }

    // 5. Check for explicit "who is / what is / about" pattern for external entities (ignoring assistant identity)
    const whoWhatMatch = cleaned.match(/\b(?:who\s+is|what\s+is|about)\s+([^.?!,]{3,80})/i);
    if (whoWhatMatch?.[1]) {
      const candidate = whoWhatMatch[1].trim();
      if (
        !/\b(you|your|yourself|u|ur|founder|founer|creator|aibot|assistant)\b/i.test(candidate) &&
        candidate.length >= 3
      ) {
        return candidate.slice(0, 80);
      }
    }

    // 6. Check user query keywords
    const userTopic = cleaned
      .replace(
        /\b(?:can\s+you\s+)?(?:please\s+)?(?:tell\s+me|explain|what\s+about|do\s+you\s+know|is\s+it\s+true\s+that|what\s+is|who\s+is)\b/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .trim();

    if (
      userTopic.length >= 4 &&
      userTopic.length <= 100 &&
      !/\b(you|your|yourself|founder|founer|creator|aibot)\b/i.test(userTopic)
    ) {
      return userTopic.slice(0, 80);
    }
  }

  return null;
}

/**
 * Cleans user conversational prompt into keyword-focused search engine queries.
 * Integrates conversation history to resolve pronouns and meta-search directives.
 */
export function extractCleanSearchQueries(
  rawQuery: string,
  history: HistoryMessage[] = [],
): string[] {
  let cleaned = rawQuery.trim();

  // 0. Resolve any reference to the founder or platform creator to the actual founder name: "Suryanshu Nabheet"
  cleaned = cleaned.replace(
    /\b(?:your\s+founder|the\s+founder\s+of\s+aibot|aibot'?s?\s+founder|your\s+creator|creator\s+of\s+aibot|aibot'?s?\s+creator)\b/gi,
    "Suryanshu Nabheet",
  );

  // Guard: Never search public web for pure assistant self-identity questions (e.g. "who are you")
  if (ASSISTANT_SELF_IDENTITY_REGEX.test(cleaned)) {
    return [];
  }

  const isPureSearchCommand = PURE_SEARCH_COMMAND_REGEX.test(cleaned);
  const isMetaDirective =
    isPureSearchCommand ||
    META_SEARCH_DIRECTIVE_REGEX.test(rawQuery) ||
    META_SEARCH_DIRECTIVE_REGEX.test(cleaned);

  // 1. Strip leading conversational conjunctions and conversational starters (e.g. "and who is", "so what is")
  cleaned = cleaned
    .replace(/^(?:and|so|also|then|but|now|well|okay|ok|hey|actually)\s+/gi, "")
    .replace(
      /^(?:can\s+you\s+(?:please\s+)?(?:tell\s+me|find|show\s+me|give\s+me|search|look\s+up)?|could\s+you\s+(?:please\s+)?(?:tell\s+me|find|show\s+me|give\s+me|search|look\s+up)?|please\s+(?:tell\s+me|find|show\s+me|give\s+me|search|look\s+up)?|tell\s+me\s+(?:about|what\s+is|who\s+is)?|find\s+(?:out\s+)?(?:more\s+)?(?:info|information|details|context)?\s*(?:of|about|on)?|i\s+(?:want|need)\s+to\s+know|do\s+you\s+know|what\s+about|how\s+about)\s+/gi,
      "",
    )
    .replace(/^(?:and|so|also|then|but|now|well|okay|ok|hey)\s+/gi, "");

  // If query is "more info about him", "more about him", "details on this", return the subject directly
  if (
    /^(?:(?:tell\s+me\s+)?more\s+(?:info|information|details|context)(?:\s+(?:about|on|for))?|more\s+about)\b/i.test(
      cleaned,
    )
  ) {
    const historicalSubject = extractSubjectFromConversationHistory(history);
    if (historicalSubject) {
      cleaned = historicalSubject;
    }
  }

  // 2. Strip explicit search wrappers
  cleaned = cleaned
    .replace(
      /\b(?:can\s+you\s+)?(?:please\s+)?(?:do\s+|run\s+|perform\s+)?(?:a\s+)?(?:web\s*search|websearch|google\s*search)\b/gi,
      "",
    )
    .replace(
      /\b(?:search\s+(?:the\s+)?(?:web|internet)|search\s+online|look\s+up\s+online|browse\s+the\s+web)\s+(?:for|about|and\s+tell\s+me|and\s+find)?/gi,
      "",
    )
    .replace(/\b(?:and\s+then\s+)?(?:give|tell|show)\s+(?:me\s+)?(?:the\s+)?/gi, "")
    .replace(
      /\b(?:to\s+(?:get|find|see|learn)|and\s+(?:get|find|see|learn)|for|about)\s+(?:the\s+)?(?:more\s+|latest\s+|recent\s+|up-to-date\s+)?(?:context|information|info|details|updates?|data|facts?)\b/gi,
      "",
    )
    .replace(/\bfor\s+me\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // 3. If user prompt was purely "do web search to get more context" or similar, use the extracted topic from history
  const isNowEmptyOrFiller =
    !cleaned ||
    /^(?:context|more\s+context|information|more\s+info|details|more\s+details|data|updates?)$/i.test(
      cleaned,
    );

  if (isMetaDirective || isNowEmptyOrFiller) {
    const historicalSubject = extractSubjectFromConversationHistory(history);
    if (historicalSubject) {
      cleaned = historicalSubject;
    } else if (/\bfounder\b/i.test(rawQuery)) {
      cleaned = "Suryanshu Nabheet";
    }
  } else if (
    /\b(him|his|her|hers|them|their|theirs|they|it|its|this\s+(?:person|company|tool|model)|that\s+(?:person|company|tool|model))\b/i.test(
      cleaned,
    ) &&
    history.length > 0
  ) {
    const previousSubject = extractSubjectFromConversationHistory(history);
    if (previousSubject) {
      cleaned = cleaned
        .replace(
          /\b(him|his|her|hers|them|their|theirs|they|it|its|this\s+(?:person|company|tool|model)|that\s+(?:person|company|tool|model))\b/gi,
          previousSubject,
        )
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  // Strip "more info about", "more details on", etc. after pronoun replacement
  cleaned = cleaned
    .replace(
      /^(?:(?:tell\s+me\s+)?more\s+(?:info|information|details|context)(?:\s+(?:about|on|for))?|more\s+about)\s+/gi,
      "",
    )
    .trim();

  // 4. Strip trailing conversational fluff
  cleaned = cleaned
    .replace(/\s+(?:for\s+me|and\s+tell\s+me|and\s+explain|to\s+me|please)\s*[.?!]*$/gi, "")
    .trim();

  // 5. Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[,.\s;:?!]+|[,.\s;:?!]+$/g, "").trim();

  if (!cleaned) return [];

  const year = new Date().getFullYear();
  const wantsFresh = FRESHNESS_KEYWORDS_REGEX.test(rawQuery);

  const queries = [cleaned.slice(0, 500)];
  if (wantsFresh && !cleaned.includes(String(year))) {
    queries.push(`${cleaned} ${year}`.slice(0, 500));
  }

  return queries.slice(0, 2);
}

/**
 * Checks if a turn indicates that Web Search is needed or was requested,
 * but was turned off in the app.
 */
export function isWebSearchRequestedOrNeeded(
  userQuery?: string,
  assistantReply?: string,
): boolean {
  const query = userQuery?.trim() ?? "";
  const reply = assistantReply?.trim() ?? "";

  if (!query && !reply) return false;

  // 1. User explicitly asked for search or browsing (always takes precedence)
  if (
    EXPLICIT_SEARCH_REGEX.test(query) ||
    PURE_SEARCH_COMMAND_REGEX.test(query) ||
    META_SEARCH_DIRECTIVE_REGEX.test(query)
  ) {
    return true;
  }

  // 2. Never flag pure self-identity, basic math, small talk, static science, or basic code without search request
  if (
    ASSISTANT_SELF_IDENTITY_REGEX.test(query) ||
    BASIC_MATH_REGEX.test(query) ||
    GREETINGS_ONLY_REGEX.test(query) ||
    STATIC_SCIENCE_REGEX.test(query) ||
    BASIC_CODE_TASK_REGEX.test(query)
  ) {
    return false;
  }

  // 2. Query asks for strong real-time or current events
  if (FRESHNESS_KEYWORDS_REGEX.test(query) && REALTIME_DATA_REGEX.test(query)) {
    return true;
  }
  if (
    /\b(latest\s+news|today'?s?\s+news|breaking\s+news|current\s+price|live\s+score|who\s+won\s+yesterday)\b/i.test(
      query,
    )
  ) {
    return true;
  }

  // 3. The assistant response indicated it cannot browse or lacks live info
  if (reply) {
    const cannotBrowsePatterns = [
      /\b(?:cannot|can't|do\s+not\s+have|unable\s+to)\s+(?:browse|search|access)\s+(?:the\s+)?(?:web|internet|live|real-time)\b/i,
      /\b(?:knowledge\s+cutoff|as\s+of\s+my\s+last\s+update|offline\s+training\s+data)\b/i,
      /\bweb\s+search\s+is\s+(?:currently\s+)?(?:off|disabled|turned\s+off)\b/i,
      /\bi\s+don'?t\s+have\s+(?:access\s+to\s+)?real-time\b/i,
      /\bi\s+cannot\s+provide\s+real-time\b/i,
    ];

    if (cannotBrowsePatterns.some((pattern) => pattern.test(reply))) {
      return true;
    }
  }

  return false;
}
