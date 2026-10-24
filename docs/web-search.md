# Web Search

AiBoT can search the public web before the model replies, inject structured results into the chat request, and show a collapsible **trace** (queries, sources, and links) above the assistant answer—similar to the **Thinking** panel.

Web search uses **keyless** providers on the server (HTML scraping + public Wikipedia opensearch). **No search API keys** — the only required third-party key for AiBoT is **`OPENROUTER_API_KEY`** for chat models.

---

## User flow

1. Open the **model menu** in the composer (same area as **Thinking**), or click the proactive prompt when typing a search request.
2. Turn on **Web search** (“Search the web before replying for fresher facts and sources”).
3. Send a message as usual.

### Agentic Search Decision & Execution

With Web Search enabled, the user's toggle forces a search for each non-empty topic, including queries that could otherwise be answered locally. Bare questions about AiBoT identity are kept local unless the user explicitly asks to search. With Web Search disabled, a deterministic intent classifier can offer a search prompt for requests that appear to need current or external information.

1. **Intent classification when search is off:** `evaluateWebSearchIntent` in `lib/web-search/intent.ts` detects explicit search requests, freshness signals, factual lookups, and conversational turns. It uses deterministic rules; it does not make an LLM planning call.
   - When search is disabled, elementary math (e.g. `2 + 2`), greetings, standard coding tasks (e.g. reverse a string, binary search), and static knowledge do not trigger a search prompt.
   - Current events, live prices, sports, weather, upcoming releases, and explicit search requests can trigger the proactive search prompt.
2. **Query formulation:** Removes search wrappers and answer instructions, caps each query, and resolves simple follow-ups from prior user turns in the current conversation. User turns are preferred; assistant text is used only as a narrow fallback for clearly stated identity attributions.
3. The UI shows a running trace (“Searching the web…”).
4. The client calls `POST /api/web-search` with the derived queries.
5. The server normalizes queries again, searches up to two in parallel, ranks and filters candidates, and fetches short excerpts from up to three public pages per query when safe and available. Search context is bounded and labels external content as untrusted evidence.
6. Search results are formatted as bounded, untrusted **web-search evidence** and appended to the user message sent to `/api/chat`. If no usable results remain, the model is told to say that and not fabricate search support.
7. The trace updates to **Ran N search(es) · M sources** with expandable query rows and source links.
8. The model streams its answer; the trace stays on the assistant message in history.

### When Web Search is OFF (Interactive Bar)

If a user sends a message requiring web search or asking to search the web while Web Search is turned off:

- The assistant message displays a sleek interactive **Web Search Prompt Bar** (`WebSearchPromptBar`) with an animated countdown timer and one-click `[ Search Web ]` confirmation. Once search begins or the timer elapses, the prompt cleanly transitions into the live trace and leaves no dead artifacts.
- Displays a clear indicator: **Web search is turned off**.
- Offers a one-click button: **Turn on Web Search & Search Now**.
- Clicking the button enables Web Search globally, persists it, and immediately executes the search and streams the answer with live sources.
- Non-technical users never face dead-end answers or have to hunt through settings.
- In the composer, typing an explicit search query when search is disabled also surfaces a proactive toggle pill.

The preference is stored in `localStorage` (`aibot_web_search_enabled`; arena panes use separate keys).

---

## Trace UI

| Element           | Behavior                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| Summary bar       | Globe icon, run summary, source count; click to expand/collapse details    |
| Collapsed preview | Up to four source favicons (stacked) beside the chevron on `sm+` viewports |
| Query rows        | Label, query chip, result count, expandable **Sources** list               |
| Source row        | Favicon, title, domain; opens in a new tab                                 |
| Error state       | Summary shows failure; chat still proceeds without injected context        |

Favicons load through `/api/favicon` (same-origin proxy) so they work under strict cross-origin policies on production (e.g. Vercel).

---

## Query planning (client)

Implemented in `lib/web-search/query.ts`—no extra LLM call.

- Strips phrasing like “search the web for…” from the user text.
- Detects news / “what is …” patterns and shortens to a focused query.
- Emits **1–2 queries** (second may append the current year when freshness cues appear).

---

## Search providers (server)

`lib/server/web-search/search.ts` runs independent keyless providers concurrently, merges candidates by URL, then ranks and filters them. News and Wikipedia are selected according to query type rather than called for every query:

1. **Tavily Search** — 100% keyless AI search engine optimized for LLMs (`X-Tavily-Access-Mode: keyless`), returning rich snippets and high-relevance pages with optional `TAVILY_API_KEY` upgrade support.
2. **Google News RSS** — keyless news results in English and Hindi; used for current or news-oriented queries.
3. **Wikipedia (MediaWiki OpenSearch)** — keyless entity and general-knowledge fallback; omitted for freshness-oriented queries.
4. **DuckDuckGo** — multi-stage fallback: GET HTML, then POST HTML, then Lite HTML, then instant JSON.
5. **Brave Search** — datacenter-friendly keyless HTML scraper.
6. **Bing** — keyless HTML scraper with decoded redirect URLs.

Each API query returns up to **8** results. The API accepts no more than two queries per request and caps `maxResults` at 8. Results include title, URL, domain, snippet, and a **brand** hint (Reddit, GitHub, Wikipedia, etc.) for UI badges. Top results may include a bounded page excerpt.

---

## API

### `POST /api/web-search`

Runs server-side search for one or more queries.

**Body:**

```json
{
  "queries": ["latest news Region X"],
  "maxResults": 8
}
```

**Success:** `{ "batches": [{ "query": "...", "results": [...] }] }` (always returns `200` with batch results so chat continues smoothly).

**Errors:** `400` invalid body, `403` unauthorized cross-origin request, `429` rate limit.

Rate limit: **30 requests / minute / client** (scope `web-search`). Query count and result count are capped server-side, and each query has a hard deadline below the route's 30-second maximum. Search page fetches validate public HTTP(S) destinations, resolve hostnames, reject private or special-use addresses, re-check redirects, and enforce response-size and timeout limits.

### `GET /api/favicon?d=example.com&sz=64`

Proxies Google’s favicon service for use in the trace UI. Rate limit: **120 / minute** (scope `favicon`).

---

## Chat integration

- **Orchestration:** `runWebSearchForTurn` in `lib/web-search/client.ts`.
- **Model context:** `formatWebSearchContextForModel` in `lib/web-search/context.ts` (English and Hindi).
- **Session:** `useChatSession` attaches `webSearchTrace` to the assistant message and retains the bounded evidence block on the user turn, so same-conversation follow-ups can recover the sources after reload.
- **Reload safety:** `normalizeWebSearchTrace` in `lib/chat/normalize-stored-messages.ts` sanitizes stored traces.

Web search composes with **Thinking mode**, attachments, and arena side-by-side chats (per-pane storage keys for search toggle). Both Thinking stages receive the evidence. The expandable Thinking panel contains a concise approach summary; final answers still follow the citation, relevance, uncertainty, and source-conflict rules.

Full conversation history remains in tab-scoped `sessionStorage`. For cross-chat and cross-session continuity, AiBoT keeps a separate, bounded index in this browser's `localStorage`: up to 24 chats, the 20 most recent user-authored messages per chat (each capped at 680 characters), with a 180-day age limit and a 96 KB total text budget. At request time, only up to four relevant snippets (maximum 3.2 KB) are sent to the model. Assistant messages and attachments are excluded. The General settings page shows the saved chat/message count and lets users disable retrieval and saving or clear the index; existing conversation history remains available within its current tab. The index stays on this device and is not synced to an account or server. Retrieved text is treated as untrusted past context, and the current request takes precedence.

The same General settings area includes **Memories & rules** for durable profile details (such as a project or role) and response preferences (such as tone or formatting). Users can add, inspect, edit, and remove entries. These entries are separately bounded to 30 memories and 30 rules, 500 characters each, and remain in this browser's local storage. Turning profile guidance off keeps entries editable in Settings but excludes them from model requests and prevents chat commands from changing them. The assistant applies only explicit commands such as “remember that I work on Project X,” “always answer with a short summary,” `update my rule from "old" to "new"`, and “forget my rule about summaries.” It does not infer or save durable preferences from ordinary conversation. Applied changes are announced in the chat UI. Profile entries are tagged as user-provided guidance and cannot override the current request or safety requirements.

---

## Deployment notes

- **100% Key-Free:** Pure keyless search out of the box — zero search API keys required.
- **Vercel / Serverless:** Request origin verification handles reverse-proxy SSL termination (`x-forwarded-proto`, `x-forwarded-host`, and `VERCEL_URL`), preventing false 403 blocks.
- **Resilience:** Parallel keyless providers (Google News RSS + Wikipedia full-text + DDG + Brave + Bing) ensure search always succeeds even when certain IP ranges encounter bot blocks.
- **Timeouts:** Web search route `maxDuration` 30s; favicon route 10s.
- **Environment:** Only `OPENROUTER_API_KEY` (and optional `NEXT_PUBLIC_APP_URL`) for chat models. No search keys whatsoever.

---

## Testing

```bash
# Unit + integration
pnpm test

# E2E (mocked /api/web-search)
pnpm test:e2e tests/e2e/web-search.spec.ts
```

Live provider tests are skipped on CI where outbound HTML scraping is unreliable.

---

## Related code

| Area                 | Path                           |
| -------------------- | ------------------------------ |
| UI                   | `components/web-search/`       |
| Client orchestration | `lib/web-search/`              |
| Server providers     | `lib/server/web-search/`       |
| Toggle hook          | `hooks/use-web-search-mode.ts` |
| API route            | `app/api/web-search/route.ts`  |
