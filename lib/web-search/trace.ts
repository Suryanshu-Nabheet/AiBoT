import type {
  WebSearchApiResult,
  WebSearchBrand,
  WebSearchStep,
  WebSearchTrace,
} from "@/lib/web-search/types";

function labelForSearchStep(brand?: WebSearchBrand): string {
  switch (brand) {
    case "x":
      return "Searched X for";
    case "reddit":
      return "Searched Reddit for";
    case "github":
      return "Searched GitHub for";
    case "youtube":
      return "Searched YouTube for";
    default:
      return "Searched the web for";
  }
}

export function buildWebSearchTraceFromResults(
  batches: WebSearchApiResult[],
  status: WebSearchTrace["status"] = "complete",
): WebSearchTrace {
  const totalResults = batches.reduce((n, b) => n + b.results.length, 0);
  const searchCount = batches.filter((b) => b.query.trim()).length;

  const steps: WebSearchStep[] = [
    {
      kind: "summary",
      label:
        searchCount === 1 ? "Ran 1 search" : `Ran ${searchCount} searches`,
      meta: totalResults > 0 ? `${totalResults} sources` : undefined,
    },
  ];

  for (const batch of batches) {
    if (!batch.query.trim()) continue;
    const topBrand =
      batch.results[0]?.brand && batch.results[0].brand !== "generic"
        ? batch.results[0].brand
        : undefined;
    const label = labelForSearchStep(topBrand);
    const stepBrand =
      label === "Searched the web for" ? undefined : topBrand;
    steps.push({
      kind: "query",
      label,
      query: batch.query,
      brand: stepBrand,
      meta:
        batch.results.length > 0
          ? `${batch.results.length} results`
          : "No results",
      sources: batch.results.slice(0, 12),
    });
  }

  return {
    status,
    steps,
    queriedAt: new Date().toISOString(),
  };
}

export function buildRunningWebSearchTrace(query: string): WebSearchTrace {
  return {
    status: "running",
    queriedAt: new Date().toISOString(),
    steps: [
      { kind: "summary", label: "Searching the web…" },
      {
        kind: "query",
        label: "Query",
        query,
        meta: "In progress",
      },
    ],
  };
}
