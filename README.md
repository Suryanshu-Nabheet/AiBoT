<image src="./public/favicon.svg" alt="AiBoT" />
# AiBoT

<div align="center">

![AiBoT](https://img.shields.io/badge/AiBoT-Production%20Ready-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15.5.7-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**The World's Fastest, Smartest, and Most Premium AI Chatbot**

[Features](#features) • [Quick Start](#quick-start) • [Tech Stack](#tech-stack) • [Configuration](#configuration) • [License](#license)

</div>

---

## ✨ Features

- ⚡ **Blazing Fast**: 60fps smooth typing animation with requestAnimationFrame
- 🎨 **Premium UI**: Glassmorphism design with pixel-perfect alignment
- 🤖 **Multi-Model Support**: GPT, Gemini, Claude, Llama, and 20+ free models
- 🔄 **Smart Failover**: Automatic model switching on rate limits
- 📱 **Fully Responsive**: Perfect on mobile, tablet, and desktop
- 🌓 **Dark/Light Mode**: Beautiful themes with smooth transitions
- 💾 **Local History**: Browser-based chat history (no auth required)
- 🚀 **Production Ready**: Optimized, tested, and deployment-ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm

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

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Custom components with Radix UI primitives
- **AI Provider**: [OpenRouter](https://openrouter.ai/) (multi-model support)
- **Markdown**: Streamdown for beautiful rendering
- **Animations**: React hooks with requestAnimationFrame

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

AiBoT supports 20+ free models including:

- **GPT**: GPT-OSS-20B (default)
- **Gemini**: 2.0 Flash, Flash Thinking
- **Claude**: Claude 3 Haiku, Sonnet
- **Llama**: 3.1, 3.2 variants
- **Mistral**: 7B Instruct, Nemo
- **And many more!**

## 🎨 Key Features Explained

### ⚡ Ultra-Fast Typing Animation

- Uses `requestAnimationFrame` for 60fps smoothness
- 5 characters per frame (~300 chars/second)
- 10x faster than traditional setInterval approach

### 🧠 Smart Failover System

- Automatically retries with backup models on rate limits
- 1-second backoff between attempts
- Transparent to users - they just see results

### 💎 Premium UI/UX

- Glassmorphism effects with backdrop-blur
- Smooth micro-interactions
- Responsive padding (16-48px based on screen size)
- Perfect message alignment with input box

## 📂 Project Structure

```
AiBoT/
├── app/                    # Next.js app directory
│   ├── (app)/             # App routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/             # Chat interface
│   ├── ui/               # UI primitives
│   └── ai-elements/      # AI-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and types
├── styles/               # Global styles
└── public/               # Static assets
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Suryanshu Nabheet**

- GitHub: [@Suryanshu-Nabheet](https://github.com/Suryanshu-Nabheet)

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for multi-model API access
- [Next.js](https://nextjs.org/) team for the amazing framework
- [Vercel](https://vercel.com/) for hosting solutions
- All open-source contributors

---

<div align="center">

**Made with ❤️ by Suryanshu Nabheet**

If you find this project useful, please consider giving it a ⭐!

</div>
