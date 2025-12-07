import type { Metadata } from "next";

const TITLE = "All-in-one AI Platform";
const DESCRIPTION =
  "AiBoT is a platform that allows you to chat with different LLMs via a unified interface.";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

export const siteConfig: Metadata = {
  title: {
    default: TITLE,
    template: `%s | ${TITLE}`,
  },
  description: DESCRIPTION,
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },

  category: "AI",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: "AiBoT",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AiBoT - All-in-one AI Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // yahoo: "your-yahoo-verification-code",
  },
  keywords: [
    "AiBoT Chat",
    "AI Fiesta",
    "AiBoT",
    "AI",
    "LLM",
    "Fast",
    "User friendly",
    "Customization",
    "Cheap",
    "web3",
    "blockchain",
    "open-source",
    "self-hosted",
    "self-hosting",
    "self-host",
    "artificial intelligence",
    "machine learning",
    "chatbot",
    "AI platform",
    "language models",
  ],
  authors: [{ name: "AiBoT Team" }],
  creator: "AiBoT Team",
  publisher: "AiBoT",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(BASE_URL!),
};
