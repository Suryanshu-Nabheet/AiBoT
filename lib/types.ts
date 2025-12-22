import { z } from "zod";

export const MODELS: ModelFull[] = [
  // OpenAI Style (Atlas)
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT-OSS 20B",
    isPremium: false,
    summary: "Efficient and powerful open-source model",
    logo: "/icons/chatgpt.svg",
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT-OSS 120B",
    isPremium: false,
    summary: "Massive 120B parameter open model",
    logo: "/icons/chatgpt.svg",
  },

  // Google
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Exp",
    isPremium: false,
    summary: "Latest Gemini with 1M context",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Gemma 3 27B",
    isPremium: false,
    summary: "High-performance 27B model",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Gemma 3 12B",
    isPremium: false,
    summary: "Balanced 12B model",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3-4b-it:free",
    name: "Gemma 3 4B",
    isPremium: false,
    summary: "Efficient 4B model",
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

  // Meta
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    isPremium: false,
    summary: "Top-tier 70B model",
    logo: "/icons/meta.svg",
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct:free",
    name: "Llama 3.1 405B",
    isPremium: false,
    summary: "Massive frontier-class model",
    logo: "/icons/meta.svg",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B",
    isPremium: false,
    summary: "Lightweight 3B model",
    logo: "/icons/meta.svg",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 405B",
    isPremium: false,
    summary: "Uncensored Llama 405B variant",
    logo: "/icons/meta.svg",
  },

  // Mistral
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1",
    isPremium: false,
    summary: "Effective 24B Mistral model",
    logo: "/icons/mistral.svg",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B",
    isPremium: false,
    summary: "Classic 7B instruct model",
    logo: "/icons/mistral.svg",
  },
  {
    id: "mistralai/devstral-2512:free",
    name: "Devstral 2512",
    isPremium: false,
    summary: "Developer preview model",
    logo: "/icons/mistral.svg",
  },
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "Dolphin Mistral 24B",
    isPremium: false,
    summary: "Uncensored Dolphin variant",
    logo: "/icons/mistral.svg",
  },

  // Qwen
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen 3 Coder",
    isPremium: false,
    summary: "Latest coding model from Qwen",
    logo: "/icons/qwen.svg",
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen 3 235B",
    isPremium: false,
    summary: "Massive scale Qwen model",
    logo: "/icons/qwen.svg",
  },
  {
    id: "qwen/qwen3-4b:free",
    name: "Qwen 3 4B",
    isPremium: false,
    summary: "Efficient Qwen model",
    logo: "/icons/qwen.svg",
  },
  {
    id: "qwen/qwen-2.5-vl-7b-instruct:free",
    name: "Qwen 2.5 VL 7B",
    isPremium: false,
    summary: "Vision-Language model",
    logo: "/icons/qwen.svg",
  },
  {
    id: "alibaba/tongyi-deepresearch-30b-a3b:free",
    name: "Tongyi Research 30B",
    isPremium: false,
    summary: "Research focused 30B model",
    logo: "/icons/qwen.svg",
  },

  // DeepSeek
  {
    id: "deepseek/deepseek-r1-0528:free",
    name: "DeepSeek R1",
    isPremium: false,
    summary: "Latest DeepSeek R1 reasoning model",
    logo: "/icons/deepseek.svg",
  },
  {
    id: "nex-agi/deepseek-v3.1-nex-n1:free",
    name: "DeepSeek V3.1 Nex",
    isPremium: false,
    summary: "Experimental DeepSeek variant",
    logo: "/icons/deepseek.svg",
  },
  {
    id: "tngtech/deepseek-r1t-chimera:free",
    name: "DeepSeek Chimera",
    isPremium: false,
    summary: "Chimera variant of DeepSeek",
    logo: "/icons/deepseek.svg",
  },
  {
    id: "tngtech/deepseek-r1t2-chimera:free",
    name: "DeepSeek Chimera 2",
    isPremium: false,
    summary: "Updated Chimera variant",
    logo: "/icons/deepseek.svg",
  },

  // Nvidia / Other
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    isPremium: false,
    summary: "Nvidia 30B model",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    isPremium: false,
    summary: "Vision capable Nvidia model",
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
    id: "allenai/olmo-3.1-32b-think:free",
    name: "OLMo 3.1 32B Think",
    isPremium: false,
    summary: "AllenAI reasoning model",
    logo: "/icons/generic.svg",
  },
  {
    id: "allenai/olmo-3-32b-think:free",
    name: "OLMo 3 32B Think",
    isPremium: false,
    summary: "AllenAI reasoning model",
    logo: "/icons/generic.svg",
  },
  {
    id: "moonshotai/kimi-k2:free",
    name: "Kimi K2",
    isPremium: false,
    summary: "Moonshot AI model",
    logo: "/icons/generic.svg",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    isPremium: false,
    summary: "Z-AI GLM model",
    logo: "/icons/generic.svg",
  },
  {
    id: "xiaomi/mimo-v2-flash:free",
    name: "MiMo V2 Flash",
    isPremium: false,
    summary: "Xiaomi fast model",
    logo: "/icons/generic.svg",
  },
  {
    id: "kwaipilot/kat-coder-pro:free",
    name: "Kat Coder Pro",
    isPremium: false,
    summary: "Coding specialized model",
    logo: "/icons/generic.svg",
  },
  {
    id: "arcee-ai/trinity-mini:free",
    name: "Trinity Mini",
    isPremium: false,
    summary: "Arcee AI mini model",
    logo: "/icons/generic.svg",
  },
  {
    id: "tngtech/tng-r1t-chimera:free",
    name: "TNG R1t Chimera",
    isPremium: false,
    summary: "TNG Tech variant",
    logo: "/icons/generic.svg",
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
