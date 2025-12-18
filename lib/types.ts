import { z } from "zod";

export const MODELS: ModelFull[] = [
  {
    id: "amazon/nova-2-lite-v1:free",
    name: "Amazon Nova 2 Lite",
    isPremium: false,
    summary: "1M context lightweight model.",
    logo: "/icons/amazon.svg",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google Gemini 2.0 Flash",
    isPremium: false,
    summary: "1M context, extremely fast TTFT, strong multimodal.",
    logo: "/icons/google.svg",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta Llama 3.3 70B",
    isPremium: false,
    summary: "Top-tier 70B model with high accuracy.",
    logo: "/icons/meta.svg",
  },

  {
    id: "google/gemma-3-27b-it:free",
    name: "Google Gemma 3 27B",
    isPremium: false,
    summary: "High-performance 27B model with 131k context.",
    logo: "/icons/google.svg",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1 24B",
    isPremium: false,
    summary: "24B small-series instruct model with 128k context.",
    logo: "/icons/mistral.svg",
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    isPremium: false,
    summary: "Massive 480B coding-focused model.",
    logo: "/icons/qwen.svg",
  },
  {
    id: "allenai/olmo-3-32b-think:free",
    name: "AllenAI Olmo 3 32B",
    isPremium: false,
    summary: "32B thinking-optimized model with 65k context.",
    logo: "/icons/allenai.svg",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Meta Llama 3.2 3B",
    isPremium: false,
    summary: "Light 3B version for efficient tasks.",
    logo: "/icons/meta.svg",
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Google Gemma 3 12B",
    isPremium: false,
    summary: "12B model with balanced performance.",
    logo: "/icons/google.svg",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Nous Hermes 3 405B",
    isPremium: false,
    summary: "405B massive instruct-tuned Llama model.",
    logo: "/icons/meta.svg",
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen3 235B",
    isPremium: false,
    summary: "Large 235B model with extended context.",
    logo: "/icons/qwen.svg",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI GPT-OSS 20B",
    isPremium: false,
    summary: "Efficient and powerful open-source 20B model.",
    logo: "/icons/chatgpt.svg",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct",
    isPremium: false,
    summary: "Efficient 7B instruct model for lightweight tasks.",
    logo: "/icons/mistral.svg",
  },
  {
    id: "qwen/qwen3-4b:free",
    name: "Qwen3 4B",
    isPremium: false,
    summary: "Compact but capable 4B model with 40k context.",
    logo: "/icons/qwen.svg",
  },
  {
    id: "google/gemma-3-4b-it:free",
    name: "Google Gemma 3 4B",
    isPremium: false,
    summary: "4B updated Gemma instruct version.",
    logo: "/icons/google.svg",
  },
];

export const SUPPORTER_MODELS = MODELS.map((model) => model.id) as [
  string,
  ...string[],
];
export type MODEL = (typeof MODELS)[number]["id"];

export type ModelFull = {
  id: string;
  name: string;
  isPremium: boolean;
  summary?: string;
  logo?: string;
};

export const CreateChatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string(),
  model: z.string(),
});

export type Message = {
  id?: string;
  content: string;
  role: Role;
  isError?: boolean;
  errorType?: string;
  attachments?: { name: string; content: string; type: string }[];
  shouldAnimate?: boolean;
};

export type Messages = Message[];

export enum Role {
  Agent = "assistant",
  User = "user",
}
