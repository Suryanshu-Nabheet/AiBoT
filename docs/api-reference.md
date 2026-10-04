# API Reference

This document details the internal API endpoints used for chat, web search, Voice, and document processing.

## Base URL

All internal API requests are relative to the application's root URL (e.g., `http://localhost:3000`).

## Endpoints

### Chat Completion

**Endpoint:** `/api/chat`  
**Method:** `POST`  
**Description:** Initiates a streaming conversation with a selected AI model.

Chat requests may include extracted document text and image content as user message parts. When **Web search** is enabled in the client, the user message also includes an appended **Web search context** block (titles, URLs, snippets) from `/api/web-search` before this request is sent. Document analysis, summaries, and follow-up questions use the same streaming endpoint and conversation context.

**Request Body:**

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "openai/gpt-4o",
  "conversationId": "uuid-string"
}
```

**Response:**  
Returns a `text/event-stream` containing the AI's response chunks.

---

### Web Search

**Endpoint:** `/api/web-search`  
**Method:** `POST`  
**Description:** Runs one or more keyless web queries server-side and returns normalized result batches for UI traces and model context.

**Request Body:**

```json
{
  "queries": ["latest news about Region X"],
  "maxResults": 8
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `queries` | `string[]` | 1–3 items, each 1–500 characters |
| `maxResults` | `number` | Optional, 1–12 (default 8) |

**Success Response:**

```json
{
  "batches": [
    {
      "query": "latest news about Region X",
      "results": [
        {
          "title": "Example headline",
          "href": "https://example.com/article",
          "domain": "example.com",
          "brand": "generic",
          "snippet": "Optional snippet text"
        }
      ]
    }
  ]
}
```

**Error Responses:**

- `400` — Invalid JSON or schema validation failure
- `429` — Rate limit (scope `web-search`, 30 requests / minute)
- `502` — All providers returned no results

See [Web Search](web-search.md) for provider order and client orchestration.

---

### Favicon proxy

**Endpoint:** `/api/favicon`  
**Method:** `GET`  
**Description:** Same-origin favicon proxy for web search source icons (avoids cross-origin issues in production).

**Query parameters:**

| Param | Required | Description |
| --- | --- | --- |
| `d` | Yes | Hostname (max 253 chars) |
| `sz` | No | Pixel size 16–128 (default 64) |

**Response:** Image bytes with cache headers, or `400` / `502` on failure.

Rate limit: **120 requests / minute** (scope `favicon`).

---

### Voice Conversation

**Endpoint:** `/api/voice`  
**Method:** `POST`  
**Description:** Sends a Voice conversation history to the selected model and returns a spoken-response transcript.

**Request Body:**

```json
{
  "messages": [{ "role": "user", "content": "Hello" }],
  "model": "openrouter/free"
}
```

**Response:**  
Returns a JSON object containing the response `content` and selected `model`.

---

## External Integrations

### OpenRouter API

AiBoT interacts with OpenRouter at `https://openrouter.ai/api/v1/chat/completions`.  
**Headers Required:**

- `Authorization`: `Bearer ${OPENROUTER_API_KEY}`
- `HTTP-Referer`: Site URL (for OpenRouter rankings)
- `X-Title`: Application name

Web search providers (DuckDuckGo, Brave HTML, Bing HTML) are fetched from the AiBoT server only; they do not use OpenRouter.

---

## Security & Rate Limiting

- **Authentication**: Backend API calls to external LLM providers are secured via server-side environment variables.
- **Validation**: Incoming requests are validated with Zod schemas (`webSearchRequestSchema`, `chatRequestSchema`, etc.).
- **Rate limiting**: Applied per scope on sensitive routes (web search, favicon, chat).
- **Streaming**: Chat responses use chunked transfer encoding for efficient data transmission.
