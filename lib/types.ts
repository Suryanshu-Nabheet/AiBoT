import { z } from "zod";

export const MODELS: ModelFull[] = [
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT-OSS 20B (Free)",
    isPremium: false,
    summary: "Efficient and powerful open-source model.",
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash Experimental (Free)",
    isPremium: false,
    summary:
      "Fastest TTFT with 1.05M context. Enhanced multimodal understanding, coding, and agentic capabilities.",
  },
  {
    id: "alibaba/tongyi-deepresearch-30b-a3b:free",
    name: "Tongyi DeepResearch 30B A3B (Free)",
    isPremium: false,
    summary:
      "30B total (3B active) MoE. Optimized for deep research, complex agentic search, and multi-step reasoning. 131K context.",
  },
  {
    id: "allenai/olmo-3-32b-think:free",
    name: "Olmo 3 32B Think (Free)",
    isPremium: false,
    summary:
      "32B model for deep reasoning and complex logic chains. Open source (Apache 2.0). 66K context.",
  },
  {
    id: "venice/uncensored:free",
    name: "Venice Uncensored (Free)",
    isPremium: false,
    summary:
      "24B uncensored Mistral variant. User-controlled alignment with transparent, steerable behavior. 33K context.",
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct (Free)",
    isPremium: false,
    summary:
      "Industry-standard 7.3B model optimized for speed and 33K context. General-purpose, efficient inference.",
  },
  {
    id: "arcee-ai/trinity-mini:free",
    name: "Trinity Mini (Free)",
    isPremium: false,
    summary:
      "26B sparse MoE (3B active, 128 experts). Long-context reasoning (131K) with strong function calling.",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B V2 (Free)",
    isPremium: false,
    summary:
      "9B unified model for reasoning and non-reasoning tasks. Controllable reasoning traces via system prompt. 128K context.",
  },
  {
    id: "nousresearch/hermes-3-405b-instruct:free",
    name: "Hermes 3 405B Instruct (Free)",
    isPremium: false,
    summary:
      "405B frontier model (Llama 3.1 based). Advanced agentic capabilities, roleplaying, and code generation. 131K context.",
  },
  {
    id: "mistralai/mistral-small-3.1-24b:free",
    name: "Mistral Small 3.1 24B (Free)",
    isPremium: false,
    summary:
      "24B multimodal model with vision support. Excellent for image analysis, programming, and math. 128K context.",
  },
  {
    id: "moonshotai/kimi-k2-0711:free",
    name: "Kimi K2 0711 (Free)",
    isPremium: false,
    summary:
      "1T parameters (32B active) MoE. Excels at coding, tool use, and reasoning with MuonClip optimizer. 128K context.",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B Instruct (Free)",
    isPremium: false,
    summary:
      "3B multilingual model (8 languages). Strong dialogue, reasoning, and tool use. Trained on 9T tokens. 131K context.",
  },
  {
    id: "qwen/qwen3-4b:free",
    name: "Qwen3 4B (Free)",
    isPremium: false,
    summary:
      "4B dual-mode architecture (thinking/non-thinking). Optimized for chat and complex agent workflows. 41K context.",
  },
  {
    id: "google/gemma-3-4b:free",
    name: "Gemma 3 4B (Free)",
    isPremium: false,
    summary:
      "4B multimodal model. Vision-language support, 140+ languages, math, reasoning, and function calling. 128K context.",
  },
  {
    id: "google/gemma-3-12b:free",
    name: "Gemma 3 12B (Free)",
    isPremium: false,
    summary:
      "12B multimodal model. Second largest Gemma 3. 140+ languages, structured outputs, and function calling. 128K context.",
  },
  {
    id: "google/gemma-3n-2b:free",
    name: "Gemma 3n 2B (Free)",
    isPremium: false,
    summary:
      "2B effective (6B arch) multimodal. MatFormer with nested submodels. Low-resource deployment. 32K context.",
  },
  {
    id: "google/gemma-3n-4b:free",
    name: "Gemma 3n 4B (Free)",
    isPremium: false,
    summary:
      "On-device optimized multimodal (text/image/audio). 140+ languages. PLE caching for efficient mobile deployment. 32K context.",
  },
  {
    id: "google/gemini-flash-1.5-8b:free",
    name: "Gemini Flash 1.5 8B (Free)",
    isPremium: false,
    summary:
      "Compact 8B model with fast inference. Balanced performance for everyday tasks. 1M context window.",
  },
  {
    id: "google/learnlm-1.5-pro-experimental:free",
    name: "LearnLM 1.5 Pro Experimental (Free)",
    isPremium: false,
    summary:
      "Education-focused model. Optimized for tutoring, explanations, and learning experiences. Based on Gemini architecture.",
  },
  {
    id: "meta-llama/llama-3.2-1b-instruct:free",
    name: "Llama 3.2 1B Instruct (Free)",
    isPremium: false,
    summary:
      "1B ultra-compact model. Multilingual support with efficient inference for edge devices. 131K context.",
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct:free",
    name: "Llama 3.1 8B Instruct (Free)",
    isPremium: false,
    summary:
      "8B general-purpose model. Strong instruction-following and reasoning. Part of Llama 3.1 family. 128K context.",
  },
  {
    id: "mistralai/mistral-nemo:free",
    name: "Mistral Nemo (Free)",
    isPremium: false,
    summary:
      "12B model developed with NVIDIA. Excellent for reasoning, coding, and multilingual tasks. 128K context.",
  },
  {
    id: "microsoft/phi-3-mini-128k-instruct:free",
    name: "Phi-3 Mini 128K Instruct (Free)",
    isPremium: false,
    summary:
      "3.8B small model. Punches above its weight in reasoning and math. 128K context for long documents.",
  },
  {
    id: "cohere/command-r-08-2024:free",
    name: "Command R 08-2024 (Free)",
    isPremium: false,
    summary:
      "35B model optimized for RAG, tool use, and enterprise workflows. Strong multilingual capabilities. 128K context.",
  },
  {
    id: "cohere/command-r-plus-08-2024:free",
    name: "Command R+ 08-2024 (Free)",
    isPremium: false,
    summary:
      "104B enhanced model. Superior RAG, complex reasoning, and enterprise-grade tool integration. 128K context.",
  },
  {
    id: "anthropic/claude-3-haiku:free",
    name: "Claude 3 Haiku (Free)",
    isPremium: false,
    summary:
      "Fastest Claude model. Optimized for speed while maintaining strong performance. 200K context window.",
  },
  {
    id: "anthropic/claude-3-sonnet:free",
    name: "Claude 3 Sonnet (Free)",
    isPremium: false,
    summary:
      "Balanced Claude model. Strong across all tasks with good speed/performance ratio. 200K context.",
  },
  {
    id: "x-ai/grok-beta:free",
    name: "Grok Beta (Free)",
    isPremium: false,
    summary:
      "xAI's conversational model. Real-time knowledge and engaging personality. Optimized for current events.",
  },
  {
    id: "ai21/jamba-1.5-mini:free",
    name: "Jamba 1.5 Mini (Free)",
    isPremium: false,
    summary:
      "Hybrid SSM-Transformer architecture. 52B total with 12B active. Efficient long-context processing. 256K context.",
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
};

export type Messages = Message[];

export enum Role {
  Agent = "assistant",
  User = "user",
}
