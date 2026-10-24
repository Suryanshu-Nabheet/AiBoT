import "server-only";

import { finalizeSearchResults } from "@/lib/server/web-search/quality";
import type { WebSearchSource } from "@/lib/web-search/types";

export type SearchQualityCase = {
  id: string;
  query: string;
  candidates: WebSearchSource[];
  relevantDomains: string[];
};

/** Stable, synthetic fixtures keep ranking regressions reproducible offline. */
export const SEARCH_QUALITY_CASES: SearchQualityCase[] = [
  {
    id: "nextjs-release",
    query: "nextjs news",
    relevantDomains: ["nextjs.org", "vercel.com"],
    candidates: [
      {
        title: "Unrelated weather headlines",
        href: "https://weather.example/news",
        domain: "weather.example",
        brand: "generic",
        snippet: "Today's local forecast.",
      },
      {
        title: "Next.js 15 Release Notes",
        href: "https://nextjs.org/blog/next-15",
        domain: "nextjs.org",
        brand: "generic",
        snippet: "Next.js 15 release updates and framework changes.",
      },
      {
        title: "Next.js announcements",
        href: "https://vercel.com/blog/nextjs-updates",
        domain: "vercel.com",
        brand: "generic",
        snippet: "Latest Next.js release news.",
      },
    ],
  },
  {
    id: "ada-biography",
    query: "Ada Lovelace biography",
    relevantDomains: ["britannica.com", "history.com"],
    candidates: [
      {
        title: "Ada Lovelace | Biography and Facts",
        href: "https://www.britannica.com/biography/Ada-Lovelace",
        domain: "britannica.com",
        brand: "generic",
        snippet:
          "Biography of Ada Lovelace, mathematician and computing pioneer.",
      },
      {
        title: "The history of early computers",
        href: "https://computing.example/history",
        domain: "computing.example",
        brand: "generic",
        snippet: "A broad overview of early computer history.",
      },
    ],
  },
  {
    id: "patna-weather",
    query: "weather in Patna today",
    relevantDomains: ["weather.com", "accuweather.com"],
    candidates: [
      {
        title: "Patna weather today",
        href: "https://weather.com/weather/today/l/Patna",
        domain: "weather.com",
        brand: "generic",
        snippet: "Current weather forecast and temperature in Patna.",
      },
      {
        title: "Kathmandu weather",
        href: "https://weather.example/kathmandu",
        domain: "weather.example",
        brand: "generic",
        snippet: "Weather and forecast for Kathmandu.",
      },
    ],
  },
  {
    id: "react-19-updates",
    query: "React 19 release updates",
    relevantDomains: ["react.dev", "github.com"],
    candidates: [
      {
        title: "React 19",
        href: "https://react.dev/blog/2024/12/05/react-19",
        domain: "react.dev",
        brand: "generic",
        snippet: "The React 19 release and upgrade guide.",
      },
      {
        title: "Release updates for unrelated software",
        href: "https://releases.example/software",
        domain: "releases.example",
        brand: "generic",
        snippet: "A release update unrelated to React.",
      },
    ],
  },
];

export type SearchQualityEvaluation = {
  caseCount: number;
  meanReciprocalRank: number;
  precisionAtFive: number;
  results: {
    id: string;
    reciprocalRank: number;
    precisionAtFive: number;
    returnedDomains: string[];
  }[];
};

export function evaluateSearchQuality(
  cases: SearchQualityCase[] = SEARCH_QUALITY_CASES,
): SearchQualityEvaluation {
  const results = cases.map((evaluationCase) => {
    const ranked = finalizeSearchResults(
      evaluationCase.query,
      evaluationCase.candidates,
      5,
    );
    const firstRelevantIndex = ranked.findIndex((source) =>
      evaluationCase.relevantDomains.includes(source.domain),
    );
    const relevantCount = ranked.filter((source) =>
      evaluationCase.relevantDomains.includes(source.domain),
    ).length;
    return {
      id: evaluationCase.id,
      reciprocalRank: firstRelevantIndex < 0 ? 0 : 1 / (firstRelevantIndex + 1),
      precisionAtFive: relevantCount / 5,
      returnedDomains: ranked.map((source) => source.domain),
    };
  });

  return {
    caseCount: results.length,
    meanReciprocalRank:
      results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.reciprocalRank, 0) /
          results.length,
    precisionAtFive:
      results.length === 0
        ? 0
        : results.reduce((sum, result) => sum + result.precisionAtFive, 0) /
          results.length,
    results,
  };
}
