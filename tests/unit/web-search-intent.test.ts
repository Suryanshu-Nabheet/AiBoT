/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { describe, expect, it } from "vitest";
import {
  evaluateWebSearchIntent,
  extractCleanSearchQueries,
  isWebSearchRequestedOrNeeded,
} from "@/lib/web-search/intent";

describe("evaluateWebSearchIntent", () => {
  describe("Negative Classification (should NOT search)", () => {
    it("skips web search for assistant self-identity, founder, and creator queries", () => {
      const cases = [
        "and who is your founder",
        "who is your founder",
        "who created you",
        "who made you",
        "who built you",
        "who is the founder of aibot",
        "who founded aibot",
        "who is suryanshu nabheet",
        "who is suryanshu",
        "tell me about suryanshu nabheet",
        "what do you know about suryanshu nabheet",
        "tell me about yourself",
        "what is your name",
        "what is aibot",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_self_identity");
        expect(result.queries).toEqual([]);
      }
    });

    it("skips web search for conversational follow-ups and assistant-directed questions", () => {
      const cases = [
        "can you help me with this?",
        "what do you think about this?",
        "go deeper",
        "explain that further",
        "give me an example",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_conversational");
      }
    });

    it("skips web search for basic arithmetic and math calculations", () => {
      const cases = [
        "what is 2 + 2",
        "2 + 2",
        "calculate 15 * 24",
        "what is 100 / 5",
        "solve 2x + 4 = 10",
        "what is the derivative of sin(x)",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_basic_math");
      }
    });

    it("skips web search for greetings and small talk", () => {
      const cases = [
        "hello",
        "hi there",
        "good morning!",
        "how are you?",
        "thank you so much",
        "goodbye",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_chitchat");
      }
    });

    it("skips web search for creative writing without temporal anchors", () => {
      const cases = [
        "write a poem about the ocean",
        "tell me a funny joke",
        "write a short sci-fi story about a robot",
        "compose a haiku about winter",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_creative");
      }
    });

    it("skips web search for standard coding tasks and classic algorithms", () => {
      const cases = [
        "write a python function to reverse a string",
        "how to implement binary search in typescript",
        "give me a javascript function to check if a word is palindrome",
        "write a quicksort algorithm in python",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_basic_code");
      }
    });

    it("skips web search for universal static scientific/historical explanations", () => {
      const cases = [
        "why is the sky blue",
        "explain photosynthesis",
        "how do airplanes fly",
        "what is the speed of light",
        "what is reinforcement learning?",
        "explain machine learning",
        "what is artificial intelligence",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to skip search`).toBe(
          false,
        );
        expect(result.reason).toBe("skip_general_knowledge");
      }
    });
  });

  describe("Positive Classification (MUST search)", () => {
    it("always searches when user explicitly asks for web search", () => {
      const cases = [
        "search the web for python 3.13 changes",
        "do a web search and find latest news about NASA",
        "look up online what happened in tech today",
        "search online for Nvidia GTC announcements",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to search`).toBe(true);
        expect(result.reason).toBe("explicit_request");
        expect(result.queries.length).toBeGreaterThan(0);
      }
    });

    it("searches for real-time market data, prices, and live events", () => {
      const cases = [
        "what is the current stock price of Apple?",
        "Bitcoin price today",
        "weather in New York today",
        "who won the football match yesterday?",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to search`).toBe(true);
        expect(result.queries.length).toBeGreaterThan(0);
      }
    });

    it("searches for fast-moving models and fresh updates", () => {
      const cases = [
        "latest updates on DeepSeek V3",
        "React 19 release features",
        "OpenAI Sora latest news",
      ];
      for (const query of cases) {
        const result = evaluateWebSearchIntent(query);
        expect(result.shouldSearch, `Expected "${query}" to search`).toBe(true);
        expect(result.queries.length).toBeGreaterThan(0);
      }
    });

    it("forces search when force option is set", () => {
      const result = evaluateWebSearchIntent("what is 2 + 2", { force: true });
      expect(result.shouldSearch).toBe(true);
      expect(result.queries.length).toBeGreaterThan(0);
    });
  });

  it("distills long research requests and drops answer-format instructions", () => {
    const prompt =
      "Please use web search to research the latest AI agent frameworks and compare Vercel AI SDK with LangGraph, then write a comprehensive recommendation report with code samples, citations, and a conclusion. Focus on the factual differences.";
    const queries = extractCleanSearchQueries(prompt);

    expect(queries[0]).toContain("AI agent frameworks");
    expect(queries[0]).toContain("Vercel AI SDK");
    expect(queries[0]).toContain("LangGraph");
    expect(queries[0]).not.toMatch(
      /recommendation report|code samples|citations/i,
    );
    expect(queries[0].length).toBeLessThan(prompt.length * 0.7);
  });

  describe("Contextual pronoun and command resolution", () => {
    it("resolves pronouns from previous conversation turn", () => {
      const recent = ["who is Sam Altman?"];
      const queries = extractCleanSearchQueries(
        "what is his latest news?",
        recent,
      );
      expect(queries.some((q) => /Sam Altman/i.test(q))).toBe(true);
    });

    it("resolves pure search commands like 'do web search' from multi-turn assistant context", () => {
      const history = [
        { role: "user", content: "Is SpaceX acquiring xAI?" },
        {
          role: "assistant",
          content:
            "There has no officially recorded merger between SpaceX and XAI in public records as of today.",
        },
      ];
      const queries = extractCleanSearchQueries("do web search", history);
      expect(queries.length).toBeGreaterThan(0);
      expect(
        queries.some((q) => /SpaceX/i.test(q) && /XAI/i.test(q)),
        `Expected queries to contain SpaceX and XAI, got: ${JSON.stringify(queries)}`,
      ).toBe(true);
    });

    it("evaluates intent properly for 'do web search' with history", () => {
      const history = [
        { role: "user", content: "tell me about Tesla robotaxi" },
        {
          role: "assistant",
          content: "Tesla announced plans for Cybercab unveiling.",
        },
      ];
      const result = evaluateWebSearchIntent("do web search", {
        conversationHistory: history,
      });
      expect(result.shouldSearch).toBe(true);
      expect(result.queries.some((q) => /Tesla/i.test(q))).toBe(true);
    });

    it("resolves subject and searches when user asks 'do web search to get more context' with founder history", () => {
      const history = [
        { role: "user", content: "who are you" },
        {
          role: "assistant",
          content:
            "I am AiBoT, an AI chat platform created and built by Suryanshu Nabheet. How can I assist you today?",
        },
        { role: "user", content: "tell me more about your founer" },
        {
          role: "assistant",
          content:
            "My founder and creator is Suryanshu Nabheet. He is the visionary behind AiBoT, and I am proud to be part of this innovative platform. If you have any more questions, feel free to ask!",
        },
      ];

      const result = evaluateWebSearchIntent(
        "do web search to get more context",
        {
          conversationHistory: history,
        },
      );
      expect(result.shouldSearch).toBe(true);
      expect(result.queries.length).toBeGreaterThan(0);
      expect(
        result.queries.some((q) => /Suryanshu Nabheet/i.test(q)),
        `Expected queries to contain Suryanshu Nabheet, got: ${JSON.stringify(result.queries)}`,
      ).toBe(true);

      const isNeeded = isWebSearchRequestedOrNeeded(
        "do web search to get more context",
      );
      expect(isNeeded).toBe(true);
    });

    it("searches for founder 'Suryanshu Nabheet' when explicitly requested with search directives", () => {
      const explicitCases = [
        "find more info of your founder do web search and get more context",
        "search the web for your founder",
        "look up online about your founder",
        "do web search to learn more about the founder of aibot",
      ];

      for (const query of explicitCases) {
        const result = evaluateWebSearchIntent(query);
        expect(
          result.shouldSearch,
          `Expected "${query}" to trigger search`,
        ).toBe(true);
        expect(result.reason).toBe("explicit_request");
        expect(
          result.queries.some((q) => /Suryanshu Nabheet/i.test(q)),
          `Expected "${query}" to resolve to Suryanshu Nabheet, got: ${JSON.stringify(result.queries)}`,
        ).toBe(true);
        expect(isWebSearchRequestedOrNeeded(query)).toBe(true);
      }
    });

    it("resolves subject and searches when user says 'do web search' following assistant refusal mentioning founder", () => {
      const refusalHistory = [
        {
          role: "assistant",
          content:
            "I'm sorry for any confusion, but as AiBoT, I do not have the capability to perform web searches or access external information sources. My responses are based on the data and knowledge available to me during my training. If you'd like to know more about my founder, Suryanshu Nabheet, I recommend visiting a search engine like Google and typing in 'Suryanshu Nabheet' to find more context and information about him.",
        },
      ];

      const result = evaluateWebSearchIntent("do web search", {
        conversationHistory: refusalHistory,
      });
      expect(result.shouldSearch).toBe(true);
      expect(
        result.queries.some((q) => /Suryanshu Nabheet/i.test(q)),
        `Expected queries to contain Suryanshu Nabheet, got: ${JSON.stringify(result.queries)}`,
      ).toBe(true);
    });

    it("strips leading conjunctions and conversational transitions from search queries", () => {
      const cases = [
        { raw: "and who is Elon Musk", expected: "Elon Musk" },
        {
          raw: "and what about Tesla stock price",
          expected: "Tesla stock price",
        },
        { raw: "so what happened with OpenAI today", expected: "OpenAI today" },
        {
          raw: "can you please search online and tell me latest NASA news",
          expected: "latest NASA news",
        },
      ];
      for (const { raw, expected } of cases) {
        const queries = extractCleanSearchQueries(raw);
        expect(queries.length).toBeGreaterThan(0);
        expect(queries[0].toLowerCase()).toContain(expected.toLowerCase());
        expect(queries[0].toLowerCase().startsWith("and ")).toBe(false);
        expect(queries[0].toLowerCase().startsWith("so ")).toBe(false);
      }
    });
  });
});

describe("isWebSearchRequestedOrNeeded", () => {
  it("returns false for founder and self-identity queries", () => {
    expect(isWebSearchRequestedOrNeeded("and who is your founder")).toBe(false);
    expect(isWebSearchRequestedOrNeeded("who is your founder")).toBe(false);
    expect(isWebSearchRequestedOrNeeded("who created you")).toBe(false);
    expect(isWebSearchRequestedOrNeeded("who built aibot")).toBe(false);
  });

  it("detects explicit search in user query", () => {
    expect(
      isWebSearchRequestedOrNeeded("search the web for the latest movies"),
    ).toBe(true);
    expect(isWebSearchRequestedOrNeeded("can you google this for me?")).toBe(
      true,
    );
  });

  it("detects when assistant indicates it cannot browse or search is off", () => {
    const assistantReply =
      "I cannot browse the live web or access real-time internet. Web search is currently turned off.";
    expect(
      isWebSearchRequestedOrNeeded("tell me today's news", assistantReply),
    ).toBe(true);
  });

  it("returns false for basic questions without search intent or assistant denial", () => {
    expect(isWebSearchRequestedOrNeeded("what is 2 + 2", "2 + 2 is 4.")).toBe(
      false,
    );
  });
});
