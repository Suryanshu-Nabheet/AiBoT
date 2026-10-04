# Platform Features

AiBoT is a multi-model AI assistant for conversations, voice interaction, document work, and **grounded web search**.

## Conversational AI

Chat provides a unified interface for interacting with frontier Large Language Models.

### Capabilities

- **Multi-Model Support**: Seamlessly switch between 20+ LLMs including GPT-4, Claude, Gemini, and Llama.
- **Vision Integration**: Analyze images and perform OCR by uploading image attachments.
- **Context Management**: Handles long-context conversations with automatic summarization logic.
- **Optimized Rendering**: Uses a smooth typing animation for real-time streaming output.
- **Thinking mode**: Optional deep reasoning — extra time to process, analyze, and structure the answer before replying.
- **Web search**: Optional pre-reply web lookup with a visible trace (queries, sources, links) and context injected into the model prompt. See [Web Search](web-search.md).

---

## Web Search

Search the public web from chat without third-party search API keys.

### Capabilities

- **Composer toggle**: Enable **Web search** from the model menu; preference persists in the browser.
- **Automatic queries**: Derives focused search queries from the user message (including freshness/news patterns).
- **Multi-provider fallback**: DuckDuckGo first, then Brave and Bing HTML fallbacks for production resilience.
- **Trace panel**: Collapsible UI aligned with Thinking — summary, per-query results, and clickable sources with favicons.
- **Grounded replies**: Injects a structured “Web search context” block into the turn so the model can cite URLs.
- **Durable history**: Traces are stored on assistant messages and survive reload via conversation persistence.

Full flow, APIs, and deployment notes: **[Web Search](web-search.md)**.

---

## Document Work in Chat

Upload material into a regular conversation and ask for the output you need. The document context stays available for follow-up questions in the same chat.

### Capabilities

- **Multi-Format Extraction**: Supports PDF, DOCX, PPTX, XLSX, text, images, and video frames.
- **Structured Responses**: Request briefs, study notes, research synthesis, spreadsheet comparisons, or focused extraction.
- **Grounded Follow-Ups**: Keep the attached material in chat history and ask further questions without re-uploading it.
- **Response Actions**: Listen to, copy, and download document responses as PDF.

Web search can be used on the same turn as attachments (search context is appended to the user message content).

---

## Global Platform Features

### UI/UX

- **Adaptive Dark Mode**: Optimized for high-contrast visibility and reduced eye strain.
- **Responsive Design**: Fully functional across desktop, tablet, and mobile devices.
- **Glassmorphism Aesthetics**: Modern, premium design system with subtle transparencies and blurs.

### Performance

- **Streaming Architecture**: Minimal time-to-first-token using Server-Sent Events.
- **Dynamic Imports**: Optimized bundle sizes for faster initial page loads.
- **Session Persistence**: Automated saving of conversations (including web search traces) and Voice session state to local and session storage.
