# Deployment Guide

This document outlines the procedures for deploying the AiBoT platform to various environments.

## Vercel Deployment (Recommended)

The application is optimized for Vercel, leveraging Edge Functions and the Next.js App Router.

### Steps
1. Push your code to a GitHub, GitLab, or Bitbucket repository.
2. Import the project into the Vercel Dashboard.
3. Configure Environment Variables:
   - `OPENROUTER_API_KEY`: Your OpenRouter API Key.
   - `NEXT_PUBLIC_APP_URL`: The production URL of your application.
4. Deploy.

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

---

## Static Analysis and Build Checks

Before every deployment, ensure the application passes all quality gates:

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Production build test
pnpm build
```

## Scaling Considerations

- **API Rate Limits**: Monitor OpenRouter usage and implement caching layers if necessary.
- **Edge Runtime**: Use the Next.js Edge Runtime for API routes that require minimal latency.
- **State Persistence**: For multi-instance deployments requiring shared state, consider transitioning from local storage to a centralized database solution.
