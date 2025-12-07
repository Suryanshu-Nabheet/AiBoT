<div align="center">

<img src="./public/favicon.svg" alt="AiBoT Logo" width="64" height="64" />

# AiBoT

[![Production Ready](https://img.shields.io/badge/AiBoT-Production%20Ready-blue?style=for-the-badge)](https://github.com/Suryanshu-Nabheet/AiBoT)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**The World's Fastest, Smartest, and Most Premium AI Chatbot**

[Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#️-tech-stack) • [Configuration](#️-configuration) • [License](#-license)

</div>

---

## ✨ Features

- ⚡ **Blazing Fast**: 60fps smooth typing animation with requestAnimationFrame achieving 300+ chars/second throughput
- 🎨 **Premium UI**: Glassmorphism design with pixel-perfect alignment and backdrop-blur effects
- 🤖 **Multi-Model Support**: GPT, Gemini, Claude, Llama, Mistral, and 20+ free models with unified interface
- 🔄 **Smart Failover**: Automatic model switching on rate limits with exponential backoff
- 📱 **Fully Responsive**: Perfect on mobile, tablet, and desktop (320px - 4K+)
- 🌓 **Dark/Light Mode**: Beautiful themes with smooth transitions and system preference detection
- 💾 **Local History**: Browser-based chat history with no authentication required
- 🚀 **Production Ready**: Optimized bundle (<100KB initial), tested, and deployment-ready
- ♿ **Accessible**: WCAG 2.1 AA compliant with full keyboard navigation
- 🔒 **Secure**: Input validation, XSS prevention, and encrypted local storage

## 🚀 Quick Start

### Prerequisites

- Node.js 18.17.0+ or Bun 1.0.0+
- pnpm 8.0.0+ (recommended) or npm 9.0.0+

### Installation

```bash
# Clone the repository
git clone https://github.com/Suryanshu-Nabheet/AiBoT.git
cd AiBoT

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Add your OPENROUTER_API_KEY to .env

# Run development server
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
pnpm run build
pnpm start
```

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router) - React framework with SSR/SSG capabilities
- **Language**: [TypeScript 5.0](https://www.typescriptlang.org/) - Type-safe development with strict mode enabled
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) - Utility-first CSS framework with custom configuration
- **UI Components**: Custom components with [Radix UI](https://www.radix-ui.com/) primitives for accessibility
- **AI Provider**: [OpenRouter](https://openrouter.ai/) - Multi-model API aggregation with 20+ models
- **Markdown**: Streamdown - Streaming markdown parser for real-time rendering
- **Animations**: React hooks with requestAnimationFrame - 60fps performance optimized
- **State Management**: React Hooks - Built-in state management with custom hooks
- **Storage**: Browser LocalStorage - Client-side persistence with encryption

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Required: OpenRouter API Key
OPENROUTER_API_KEY=your_api_key_here

# Optional: Site configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=AiBoT
```

### Supported Models

AiBoT supports 20+ free models with intelligent routing:

- **GPT**: GPT-OSS-20B (default) - General purpose, 8K context
- **Gemini**: 2.0 Flash (1M context), Flash Thinking (32K context) - Long-form content and complex reasoning
- **Claude**: Claude 3 Haiku (200K context), Claude 3.5 Sonnet (200K context) - Fast responses and advanced tasks
- **Llama**: 3.1 405B (128K context), 3.2 90B Vision (128K context) - Open-source and multimodal processing
- **Mistral**: 7B Instruct (32K context), Nemo (128K context) - Efficient inference with extended context
- **And many more!** - DeepSeek, Qwen, Phi, and additional models

## 🎨 Key Features Explained

### ⚡ Ultra-Fast Typing Animation

- Uses `requestAnimationFrame` for 60fps smoothness and consistent frame timing
- 5 characters per frame (~300 chars/second) for optimal reading speed
- 10x faster than traditional setInterval approach with better performance
- Automatic backpressure handling for large responses

### 🧠 Smart Failover System

- Automatically retries with backup models on rate limits (429 errors)
- 1-second exponential backoff between retry attempts
- Circuit breaker pattern to prevent cascade failures
- Transparent to users - seamless experience without interruption
- Configurable retry logic with up to 3 fallback models

### 💎 Premium UI/UX

- Glassmorphism effects with backdrop-blur and transparency layers
- Smooth micro-interactions and hover effects throughout
- Responsive padding (16-48px based on screen size) for optimal spacing
- Perfect message alignment with input box for visual consistency
- Mobile-first design with adaptive layouts
- Loading states and skeleton screens for perceived performance

## 📂 Project Structure

```
AiBoT/
├── app/                          # Next.js 15 app directory
│   ├── (app)/                   # Application routes group
│   │   ├── page.tsx            # Main chat interface
│   │   └── layout.tsx          # App-specific layout
│   ├── api/                     # API routes
│   │   ├── chat/               # Chat completion endpoint
│   │   │   └── route.ts
│   │   └── models/             # Model listing endpoint
│   │       └── route.ts
│   ├── layout.tsx              # Root layout with providers
│   ├── globals.css             # Global styles and Tailwind imports
│   └── error.tsx               # Global error boundary
├── components/                  # React components
│   ├── chat/                   # Chat interface components
│   │   ├── ChatInterface.tsx  # Main chat container
│   │   ├── MessageList.tsx    # Message rendering with virtualization
│   │   ├── MessageInput.tsx   # Input with controls and validation
│   │   └── ModelSelector.tsx  # Model selection dropdown
│   ├── ui/                     # Reusable UI primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   └── ...
│   └── ai-elements/            # AI-specific components
│       ├── StreamingText.tsx
│       └── CodeBlock.tsx
├── hooks/                       # Custom React hooks
│   ├── useChat.ts              # Chat state management
│   ├── useLocalStorage.ts      # Persistent storage hook
│   ├── useTheme.ts             # Theme switching logic
│   └── useStreamingText.ts     # Text streaming animation
├── lib/                         # Core utilities and types
│   ├── api/                    # API clients
│   │   ├── openrouter.ts      # OpenRouter integration
│   │   └── stream-parser.ts   # SSE response parser
│   ├── config/                 # Configuration files
│   │   ├── models.ts          # Model definitions and settings
│   │   └── app.ts             # App constants
│   ├── utils/                  # Helper functions
│   │   ├── cn.ts              # Class name merger (clsx + tailwind-merge)
│   │   ├── token-counter.ts   # Token estimation utility
│   │   └── validators.ts      # Input validation functions
│   └── types/                  # TypeScript type definitions
│       ├── chat.ts
│       ├── models.ts
│       └── api.ts
├── styles/                      # Additional CSS styles
│   └── animations.css          # Custom keyframe animations
├── public/                      # Static assets
│   ├── favicon.svg            # App icon
│   └── images/                # Image assets
├── .env.example                # Environment variables template
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier code formatting
├── next.config.js             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript compiler options
└── package.json               # Dependencies and scripts
```

## 🚀 Deployment

### Deploy on Vercel (Recommended)

The easiest way to deploy AiBoT is using the Vercel Platform:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Suryanshu-Nabheet/AiBoT)

Or using Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod
```

### Docker Deployment

```bash
# Build Docker image
docker build -t aibot .

# Run container
docker run -p 3000:3000 -e OPENROUTER_API_KEY=your_key aibot
```

### Self-Hosted

```bash
# Build for production
pnpm run build

# Start production server
pnpm start
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes with proper commit messages (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request with a clear description

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions or modifications
- `chore:` Build process or tooling changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Suryanshu Nabheet**

- GitHub: [@Suryanshu-Nabheet](https://github.com/Suryanshu-Nabheet)
- Portfolio: [suryanshu.dev](https://suryanshu.dev)

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for multi-model API access and aggregation
- [Next.js](https://nextjs.org/) team for the amazing React framework
- [Vercel](https://vercel.com/) for hosting solutions and platform
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Radix UI](https://www.radix-ui.com/) for accessible component primitives
- All open-source contributors who make projects like this possible

---

<div align="center">

**Made with ❤️ by Suryanshu Nabheet**

If you find this project useful, please consider giving it a ⭐!

</div>
