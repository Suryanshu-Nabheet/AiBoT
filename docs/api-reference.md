# API Reference

This document details the internal API endpoints used for chat, Voice, and document processing.

## Base URL

All internal API requests are relative to the application's root URL (e.g., `http://localhost:3000`).

## Endpoints

### Chat Completion

**Endpoint:** `/api/chat`  
**Method:** `POST`  
**Description:** Initiates a streaming conversation with a selected AI model.

Chat requests may include extracted document text and image content as user message parts. Document analysis, summaries, and follow-up questions use the same streaming endpoint and conversation context.

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

### Voice Conversation

**Endpoint:** `/api/voice`<br />
**Method:** `POST`<br />
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

## Security & Rate Limiting

- **Authentication**: Backend API calls to external providers are secured via server-side environment variables.
- **Validation**: All incoming requests are validated against Zod schemas.
- **Streaming**: Responses use chunked transfer encoding for efficient data transmission.
