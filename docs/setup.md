# <kbd>END-TO-END SETUP GUIDE</kbd>

This guide provides detailed instructions for setting up the AiBoT development environment, configuring AI models, and troubleshooting common issues.

## <kbd>PREREQUISITES</kbd>

Before you begin, ensure you have the following installed:
- **Node.js**: Version 18.17.0 or higher (LTS recommended)
- **pnpm**: Version 8.0.0 or higher (Standard for this project)
- **Git**: For cloning the repository

## <kbd>QUICK SETUP</kbd> (Recommended)

We provide an automated setup script that handles dependency installation, environment configuration, and server launch in one go.

```bash
# 1. Clone the repository
git clone https://github.com/Suryanshu-Nabheet/AiBoT.git
cd AiBoT

# 2. Run the automated setup script
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The script will:
- Check for Node.js and pnpm.
- Create a `.env` file from `.env.example` if it doesn't exist.
- Install all necessary dependencies using `pnpm install`.
- Launch the development server.

---

## <kbd>MANUAL SETUP</kbd>

If you prefer to set up the project manually, follow these steps:

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```
Open `.env` and add your **OpenRouter API Key**:
```env
OPENROUTER_API_KEY=your_key_here
```

### 3. Start Development Server
```bash
pnpm dev
```
The application will be available at `http://localhost:3000`.

---

## <kbd>AI MODELS & API CONFIGURATION</kbd>

AiBoT uses **OpenRouter** as the primary AI gateway, providing access to over 20+ state-of-the-art LLMs.

### Available Models
The following models are configured by default (see `lib/types.ts`):
- **GPT-OSS 120B**: OpenAI's open-weight MoE model.
- **Llama 3.3 70B**: Meta's latest instruction-tuned model.
- **Qwen3 Coder 480B**: SOTA code generation and reasoning.
- **Gemma 3 27B**: Google's latest open multimodal model.
- **Nemotron 3 Super**: NVIDIA's frontier 120B MoE model.

### Adding New Models
To add or modify models, edit the `MODELS` array in `lib/types.ts`:

```typescript
{
  id: "provider/model-id",
  name: "Display Name",
  isPremium: false,
  summary: "Brief description of the model",
  logo: "/icons/provider.svg",
}
```

---

## <kbd>PRODUCTION READINESS TEST</kbd>

Before deploying or for deep debugging of AI endpoints, you can run our internal readiness script:

```bash
./scripts/scripts.sh
```
This script tests every configured model in `lib/types.ts` against the OpenRouter API to ensure connectivity and response validity.

---

## <kbd>TROUBLESHOOTING</kbd>

### 1. pnpm not found
If `pnpm` is not installed, the setup script will try to install it globally. If that fails, run:
```bash
npm install -g pnpm
```

### 2. API Key Errors
Ensure your `OPENROUTER_API_KEY` in `.env` is correct. You can verify it by running `./scripts/scripts.sh`.

### 3. Node version mismatch
If you encounter errors related to Node.js versions, we recommend using **nvm**:
```bash
nvm install 20
nvm use 20
```

---

## <kbd>NEXT STEPS</kbd>
- Explore the [Architecture](../README.md#architecture) in the main README.
- Check out the [Contributing Guidelines](../CONTRIBUTING.md).
