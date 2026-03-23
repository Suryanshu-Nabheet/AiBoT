import { z } from "zod";

export const MODELS: ModelFull[] = [
  {
    id: "openrouter/free",
    name: "OpenRouter Free",
    isPremium: false,
    summary: "Automatically routes to the best available free model",
    logo: "/icons/openrouter.svg",
  },
  {
    id: "openrouter/auto",
    name: "OpenRouter Auto",
    isPremium: false,
    summary: "Automatically routes to the best available model",
    logo: "/icons/openrotuer.svg",
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Gemma 3 12B",
    isPremium: false,
    summary: "Balanced 12B model from Google",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3-4b-it:free",
    name: "Gemma 3 4B",
    isPremium: false,
    summary: "Efficient 4B model from Google",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3n-e4b-it:free",
    name: "Gemma 3n 4B",
    isPremium: false,
    summary: "Optimized Gemma 3 variant",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3n-e2b-it:free",
    name: "Gemma 3n 2B",
    isPremium: false,
    summary: "Tiny, efficient Gemma variant",
    logo: "/icons/google.svg",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    isPremium: false,
    summary: "High-performance Nvidia 30B model",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    isPremium: false,
    summary: "Vision-capable Nvidia model",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B",
    isPremium: false,
    summary: "Efficient 9B Nvidia model",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    isPremium: false,
    summary: "High-quality Z-AI model",
    logo: "/icons/zai.svg",
  },
  {
    id: "arcee-ai/trinity-mini:free",
    name: "Trinity Mini",
    isPremium: false,
    summary: "Efficient Arcee AI mini model",
    logo: "/icons/arcee.svg",
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
