# Web Search

AiBoT can search the public web before the model replies, inject structured results into the chat request, and show a collapsible **trace** (queries, sources, and links) above the assistant answer—similar to the **Thinking** panel.

Web search uses **keyless** providers on the server (HTML scraping + public Wikipedia opensearch). **No search API keys** — the only required third-party key for AiBoT is **`OPENROUTER_API_KEY`** for chat models.

---

## User flow

1. Open the **model menu** in the composer (same area as **Thinking**).
2. Turn on **Web search** (“Search the web before replying for fresher facts and sources”).
3. Send a message as usual.

On each turn with web search enabled:

1. The UI shows a running trace (“Searching the web…”).
2. The client calls `POST /api/web-search` with one or two derived queries.
3. Search results are formatted as **Web search context** and appended to the user message sent to `/api/chat`.
4. The trace updates to **Ran N search(es) · M sources** with expandable query rows and source links.
5. The model streams its answer; the trace stays on the assistant message in history.

The preference is stored in `localStorage` (`aibot_web_search_enabled`; arena panes use separate keys).

---

## Trace UI

| Element | Behavior |
| --- | --- |
| Summary bar | Globe icon, run summary, source count; click to expand/collapse details |
| Collapsed preview | Up to four source favicons (stacked) beside the chevron on `sm+` viewports |
| Query rows | Label, query chip, result count, expandable **Sources** list |
| Source row | Favicon, title, domain; opens in a new tab |
| Error state | Summary shows failure; chat still proceeds without injected context |

Favicons load through `/api/favicon` (same-origin proxy) so they work under strict cross-origin policies on production (e.g. Vercel).

---

## Query planning (client)

Implemented in `lib/web-search/query.ts`—no extra LLM call.

- Strips phrasing like “search the web for…” from the user text.
- Detects news / “what is …” patterns and shortens to a focused query.
- Emits **1–2 queries** (second may append the current year when freshness cues appear).

---

## Search providers (server)

`lib/server/web-search/search.ts` runs 5 **100% key-free** providers in parallel, merges by URL, then applies quality filters:

1. **Google News RSS** — 100% keyless and reliable from Vercel / serverless IPs; covers real-time news, articles, and general web queries in English and Hindi.
2. **Wikipedia (MediaWiki Full-Text Search)** — searches article contents with highlighted snippet extraction and `opensearch` fallback, compliant with Wikimedia API policy.
3. **DuckDuckGo** — multi-stage fallback: GET HTML, then POST HTML, then Lite HTML, then instant JSON.
4. **Brave Search** — datacenter-friendly keyless HTML scraper.
5. **Bing** — keyless HTML scraper with decoded redirect URLs.

Each query returns up to **8** results by default (configurable up to 12 on the API). Results include title, URL, domain, snippet, and a **brand** hint (Reddit, GitHub, Wikipedia, etc.) for UI badges.

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

Rate limit: **30 requests / minute / client** (scope `web-search`).

### `GET /api/favicon?d=example.com&sz=64`

Proxies Google’s favicon service for use in the trace UI. Rate limit: **120 / minute** (scope `favicon`).

---

## Chat integration

- **Orchestration:** `runWebSearchForTurn` in `lib/web-search/client.ts`.
- **Model context:** `formatWebSearchContextForModel` in `lib/web-search/context.ts` (English and Hindi).
- **Session:** `useChatSession` attaches `webSearchTrace` to the assistant message and persists it with the conversation snapshot.
- **Reload safety:** `normalizeWebSearchTrace` in `lib/chat/normalize-stored-messages.ts` sanitizes stored traces.

Web search composes with **Thinking mode**, attachments, and arena side-by-side chats (per-pane storage keys for search toggle).

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

| Area | Path |
| --- | --- |
| UI | `components/web-search/` |
| Client orchestration | `lib/web-search/` |
| Server providers | `lib/server/web-search/` |
| Toggle hook | `hooks/use-web-search-mode.ts` |
| API route | `app/api/web-search/route.ts` |
