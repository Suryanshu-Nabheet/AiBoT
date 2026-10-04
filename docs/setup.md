# Setup and Installation

This guide provides detailed instructions for setting up the AiBoT development environment, configuring AI models, and troubleshooting common issues.

## Prerequisites

Before installation, ensure the following requirements are met:

- **Node.js**: Version 20.9.0 or higher, matching the project engine requirement.
- **pnpm**: Version 11.25.0, matching the version pinned in `package.json`.
- **Git**: For version control and repository cloning.

## Quick Start (Automated)

The project includes an automated setup script that handles dependency installation and environment configuration.

```bash
# Clone the repository
git clone https://github.com/Suryanshu-Nabheet/AiBoT.git
cd AiBoT

# Execute the setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script performs the following actions:

- Validates Node.js and pnpm installations.
- Initializes the `.env` file from `.env.example`.
- Installs project dependencies.
- Starts the development server.

## Manual Installation

To set up the project manually, follow these steps:

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Configuration

Copy the example environment file and add your credentials:

```bash
cp .env.example .env
```

Update the `OPENROUTER_API_KEY` in the `.env` file with your valid API key.

**Web search** does not require additional API keys. Search runs through server-side HTML providers; only OpenRouter is needed for model replies.

Optional:

- `NEXT_PUBLIC_APP_URL` — production site URL (OpenRouter referer and absolute links).

### 3. Start Development Server

```bash
pnpm dev
```

The application will be accessible at `http://localhost:3000`.

### 4. Try Web Search

1. Open the composer **model menu**.
2. Enable **Web search**.
3. Ask a question that benefits from current information (e.g. recent news or releases).

See [Web Search](web-search.md) for behavior, limits, and testing.

## Model Configuration

AiBoT uses OpenRouter as its primary AI gateway.

### Modifying Available Models

The list of available models is managed in `lib/types.ts`. To add a new model, append a new object to the `MODELS` array:

```typescript
{
  id: "provider/model-id",
  name: "Display Name",
  isPremium: false,
  summary: "Brief description of the model capabilities",
  logo: "/icons/provider.svg",
}
```

## Validation and Testing

Run the full quality gate before opening a PR:

```bash
pnpm run check
pnpm run format:check
pnpm test
```

To verify OpenRouter connectivity and model IDs:

```bash
./scripts/scripts.sh
```

Web search–specific tests:

```bash
pnpm test tests/unit/web-search.test.ts tests/integration/web-search-orchestration.test.ts
pnpm test:e2e tests/e2e/web-search.spec.ts
```

## Troubleshooting

### Dependency Issues

If `pnpm` is not available, install it globally using npm:

```bash
npm install -g pnpm@11.25.0
```

### API Connectivity

Ensure the `OPENROUTER_API_KEY` is correctly set in the `.env` file. You can test your key independently using a `curl` request to the OpenRouter completions endpoint.

### Web Search Returns No Results Locally

Outbound HTML scraping can fail on some networks or when a provider serves a bot challenge. Production uses DuckDuckGo first with Brave/Bing fallbacks. Check server logs for `/api/web-search` and try a simpler query. Details: [Web Search — Deployment notes](web-search.md#deployment-notes).

### Node.js Versions

If you encounter version-related errors, utilize **nvm** (Node Version Manager) to switch to a compatible version:

```bash
nvm install 20
nvm use 20
```
