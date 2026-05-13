# Setup and Installation

This guide provides detailed instructions for setting up the AiBoT development environment, configuring AI models, and troubleshooting common issues.

## Prerequisites

Before installation, ensure the following requirements are met:
- **Node.js**: Version 18.17.0 or higher (LTS recommended).
- **pnpm**: Version 8.0.0 or higher.
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

### 3. Start Development Server
```bash
pnpm dev
```
The application will be accessible at `http://localhost:3000`.

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

To verify the configuration and connectivity of the AI endpoints, run the readiness script:

```bash
./scripts/scripts.sh
```
This script validates model accessibility and response integrity against the OpenRouter API.

## Troubleshooting

### Dependency Issues
If `pnpm` is not available, install it globally using npm:
```bash
npm install -g pnpm
```

### API Connectivity
Ensure the `OPENROUTER_API_KEY` is correctly set in the `.env` file. You can test your key independently using a `curl` request to the OpenRouter completions endpoint.

### Node.js Versions
If you encounter version-related errors, utilize **nvm** (Node Version Manager) to switch to a compatible version:
```bash
nvm install 20
nvm use 20
```
