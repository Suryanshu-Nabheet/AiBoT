/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

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
    logo: "/icons/openrouter.svg",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super",
    isPremium: false,
    summary: "NVIDIA's frontier 120B MoE model with 262K context",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 31B",
    isPremium: false,
    summary: "Google's next-gen open multimodal model with MatFormer architecture",
    logo: "/icons/google.svg",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Gemma 4 26B",
    isPremium: false,
    summary: "Efficient 26B variant of Gemma 4 optimized for fast reasoning",
    logo: "/icons/google.svg",
  },
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    name: "Qwen3 Next 80B",
    isPremium: false,
    summary: "Fast, stable 80B model optimized for RAG and tool use",
    logo: "/icons/qwen.svg",
  },
  {
    id: "qwen/qwen3-coder:free",
    name: "Qwen3 Coder 480B",
    isPremium: false,
    summary: "SOTA 480B MoE code generation and repository reasoning",
    logo: "/icons/qwen.svg",
  },
  {
    id: "inclusionai/ring-2.6-1t:free",
    name: "Ring 2.6 1T",
    isPremium: false,
    summary: "Frontier 1T-scale model with adaptive reasoning for agents",
    logo: "/icons/ai.svg",
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    isPremium: false,
    summary: "High-performance specialized agentic MoE model from NVIDIA",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "minimax/minimax-m2.5:free",
    name: "MiniMax M2.5",
    isPremium: false,
    summary: "SOTA productivity model for office work and complex toolchains",
    logo: "/icons/ai.svg",
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT-OSS 120B",
    isPremium: false,
    summary: "OpenAI's open-weight 117B MoE for agentic production use",
    logo: "/icons/chatgpt.svg",
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT-OSS 20B",
    isPremium: false,
    summary: "Efficient 21B MoE model release by OpenAI under Apache 2.0",
    logo: "/icons/chatgpt.svg",
  },
  {
    id: "z-ai/glm-4.5-air:free",
    name: "GLM 4.5 Air",
    isPremium: false,
    summary: "Lightweight flagship variant purpose-built for agents",
    logo: "/icons/zai.svg",
  },
  {
    id: "meta-llama/llama-3.2-3b-instruct:free",
    name: "Llama 3.2 3B",
    isPremium: false,
    summary: "Optimized multilingual model for reasoning and summarization",
    logo: "/icons/meta.svg",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    isPremium: false,
    summary: "Instruction-tuned 70B model outperforming prior baselines",
    logo: "/icons/meta.svg",
  },
  {
    id: "nousresearch/hermes-3-llama-3.1-405b:free",
    name: "Hermes 3 405B",
    isPremium: false,
    summary: "Frontier-level finetune of Llama 3.1 with advanced steering",
    logo: "/icons/ai.svg",
  },
  {
    id: "nvidia/nemotron-nano-12b-v2-vl:free",
    name: "Nemotron Nano 12B VL",
    isPremium: false,
    summary: "Hybrid Transformer-Mamba model for video understanding",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "nvidia/nemotron-nano-9b-v2:free",
    name: "Nemotron Nano 9B",
    isPremium: false,
    summary: "Unified model for reasoning tasks with controlled traces",
    logo: "/icons/nvidia.svg",
  },
  {
    id: "liquid/lfm-2.5-1.2b-thinking:free",
    name: "LFM 2.5 Thinking",
    isPremium: false,
    summary: "Lightweight reasoning-focused model for edge devices",
    logo: "/icons/ai.svg",
  },
  {
    id: "liquid/lfm-2.5-1.2b-instruct:free",
    name: "LFM 2.5 Instruct",
    isPremium: false,
    summary: "Compact, high-quality instruction-tuned model for fast AI",
    logo: "/icons/ai.svg",
  },
  {
    id: "cognitivecomputations/dolphin-mistral-24b-venice-edition:free",
    name: "Venice Uncensored",
    isPremium: false,
    summary: "Uncensored variant of Mistral Small preserving user control",
    logo: "/icons/ai.svg",
  },
  {
    id: "baidu/cobuddy:free",
    name: "CoBuddy",
    isPremium: false,
    summary: "Baidu's open conversational assistant for general tasks",
    logo: "/icons/ai.svg",
  },
  {
    id: "poolside/laguna-m.1:free",
    name: "Laguna M.1",
    isPremium: false,
    summary: "Specialized model for rapid code completion and generation",
    logo: "/icons/ai.svg",
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
