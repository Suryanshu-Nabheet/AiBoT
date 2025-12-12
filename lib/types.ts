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
    id: "arcee-ai/trinity-mini:free",
    name: "Arcee Trinity Mini",
    isPremium: false,
    summary: "131k context efficient compact model.",
    logo: "/icons/arcee.svg",
  },
  {
    id: "tngtech/tng-r1t-chimera:free",
    name: "TNG R1T Chimera",
    isPremium: false,
    summary: "High-context reasoning-focused hybrid model.",
    logo: "/icons/tng.svg",
  },
  {
    id: "allenai/olmo-3-32b-think:free",
    name: "AllenAI Olmo 3 32B",
    isPremium: false,
    summary: "32B thinking-optimized model with 65k context.",
    logo: "/icons/allenai.svg",
  },
  {
    id: "kwaipilot/kat-coder-pro:free",
    name: "Kwaipilot KAT-Coder",
    isPremium: false,
    summary: "256k context coding-specialized model.",
    logo: "/icons/kwaipilot.svg",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "NVIDIA Nemotron 12B",
    isPremium: false,
    summary: "12B model with strong multimodal abilities.",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "alibaba/tongyi-deepresearch-30b-a3b:free",
    name: "Tongyi DeepResearch 30B",
    isPremium: false,
    summary: "Research-deep reasoning model with 131k context.",
    logo: "/icons/alibaba.svg",
  },
  {
    id: "meituan/longcat-flash-chat:free",
    name: "Meituan LongCat Flash",
    isPremium: false,
    summary: "Fast chat model with 131k context.",
    logo: "/icons/meituan.svg",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "NVIDIA Nemotron 9B",
    isPremium: false,
    summary: "9B model optimized for speed and efficiency.",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "OpenAI GPT-OSS 120B",
    isPremium: false,
    summary: "Large 120B open-source experimental model.",
    logo: "/icons/chatgpt.svg",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI GPT-OSS 20B",
    isPremium: false,
    summary: "Efficient and powerful open-source 20B model.",
    logo: "/icons/chatgpt.svg",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "Z.AI GLM 4.5 Air",
    isPremium: false,
    summary: "Lightweight GLM model with strong reasoning.",
    logo: "/icons/zai.svg",
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    isPremium: false,
    summary: "Massive 480B coding-focused model.",
    logo: "/icons/qwen.svg",
  },
  {
    id: "moonshotai/kimi-k2:free",
    name: "MoonshotAI Kimi K2",
    isPremium: false,
    summary: "Fast and optimized with 32k context.",
    logo: "/icons/moonshot.svg",
  },
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "Venice Uncensored 24B",
    isPremium: false,
    summary: "24B Mistral variant with uncensored tuning.",
    logo: "/icons/mistral.svg",
  },
  {
    id: "google/gemma-3n-e2b-it:free",
    name: "Google Gemma 3n 2B",
    isPremium: false,
    summary: "Small 2B Gemma instruction-tuned model.",
    logo: "/icons/google.svg",
  },
  {
    id: "tngtech/deepseek-r1t2-chimera:free",
    name: "TNG DeepSeek R1T2",
    isPremium: false,
    summary: "Reasoning-tuned hybrid model with 163k context.",
    logo: "/icons/deepseek.svg",
  },
  {
    id: "google/gemma-3n-e4b-it:free",
    name: "Google Gemma 3n 4B",
    isPremium: false,
    summary: "Mid-size 4B model optimized for instruction tasks.",
    logo: "/icons/google.svg",
  },
  {
    id: "qwen/qwen3-4b:free",
    name: "Qwen3 4B",
    isPremium: false,
    summary: "Compact but capable 4B model with 40k context.",
    logo: "/icons/qwen.svg",
  },
  {
    id: "qwen/qwen3-235b-a22b:free",
    name: "Qwen3 235B",
    isPremium: false,
    summary: "Large 235B model with extended context.",
    logo: "/icons/qwen.svg",
  },
  {
    id: "tngtech/deepseek-r1t-chimera:free",
    name: "TNG DeepSeek R1T",
    isPremium: false,
    summary: "Reasoning-focused model with 163k context.",
    logo: "/icons/deepseek.svg",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    name: "Mistral Small 3.1 24B",
    isPremium: false,
    summary: "24B small-series instruct model with 128k context.",
    logo: "/icons/mistral.svg",
  },
  {
    id: "google/gemma-3-4b-it:free",
    name: "Google Gemma 3 4B",
    isPremium: false,
    summary: "4B updated Gemma instruct version.",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3-12b-it:free",
    name: "Google Gemma 3 12B",
    isPremium: false,
    summary: "12B model with balanced performance.",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-3-27b-it:free",
    name: "Google Gemma 3 27B",
    isPremium: false,
    summary: "High-performance 27B model with 131k context.",
    logo: "/icons/google.svg",
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
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Meta Llama 3.2 3B",
    isPremium: false,
    summary: "Light 3B version for efficient tasks.",
    logo: "/icons/meta.svg",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Nous Hermes 3 405B",
    isPremium: false,
    summary: "405B massive instruct-tuned Llama model.",
    logo: "/icons/meta.svg",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct",
    isPremium: false,
    summary: "Efficient 7B instruct model for lightweight tasks.",
    logo: "/icons/mistral.svg",
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
};

export type Messages = Message[];

export enum Role {
  Agent = "assistant",
  User = "user",
}
