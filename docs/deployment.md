# Deployment Guide

This document outlines the procedures for deploying the AiBoT platform to various environments.

## Vercel Deployment (Recommended)

The application is optimized for Vercel, leveraging the Next.js App Router and serverless functions for chat, web search, and favicon proxy routes.

### Steps

1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Import the project into the Vercel Dashboard.
3. Configure Environment Variables:
   - `OPENROUTER_API_KEY`: Your OpenRouter API Key.
   - `NEXT_PUBLIC_APP_URL`: The production URL of your application (recommended for OpenRouter referer and metadata).
4. Deploy.

Pushes to the production branch trigger automatic deployments when the Vercel Git integration is connected.

### Web search on Vercel

- **100% Key-Free Out of the Box**: No search API keys needed. Web search uses parallel keyless providers (Google News RSS, Wikipedia MediaWiki full-text search, DuckDuckGo, Brave, and Bing).
- **Vercel Reverse-Proxy / Origin Support**: API request protection properly resolves `x-forwarded-host`, `x-forwarded-proto`, and `VERCEL_URL` to prevent cross-origin 403 rejections after deployment.
- **`/api/web-search`** (`maxDuration` 30s): Runs providers in parallel; results are deduplicated and merged with fallback guarantees.
- **`/api/favicon`**: Proxies favicons same-origin so source icons render under strict cross-origin policies (COEP/CORP).
- **Rate limits**: Web search 30 req/min and favicon 120 req/min per client scope.

Operational detail: [Web Search](web-search.md).

---

## Docker Deployment

AiBoT can be containerized for deployment on any cloud provider or on-premise infrastructure.

### Dockerfile Example

```dockerfile
# Base image
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
COPY . .
RUN pnpm build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

### Build and Run

```bash
docker build -t aibot .
docker run -p 3000:3000 --env-file .env aibot
```

Ensure the container can make outbound HTTPS requests to OpenRouter and public search endpoints.

---

## Static Analysis and Build Checks

Before every deployment, ensure the application passes all quality gates:

```bash
# Combined lint + typecheck
pnpm run check

# Formatting
pnpm run format:check

# Unit and integration tests
pnpm test

# Production build test
pnpm build
```

---

## Scaling Considerations

- **API Rate Limits**: Monitor OpenRouter usage and implement caching layers if necessary.
- **Web search**: Provider HTML scraping is per-request; scale horizontally with standard serverless concurrency; watch `/api/web-search` latency and 502 rates.
- **State Persistence**: For multi-instance deployments requiring shared state, consider transitioning from local storage to a centralized database solution.
