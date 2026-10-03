export type WebSearchBrand =
  | "reddit"
  | "x"
  | "github"
  | "youtube"
  | "wikipedia"
  | "stackoverflow"
  | "generic";

export type WebSearchSource = {
  title: string;
  domain: string;
  href: string;
  brand: WebSearchBrand;
  snippet?: string;
  /** Plain-text excerpt fetched from the result page (when available). */
  pageExcerpt?: string;
};

export type WebSearchStep =
  | {
      kind: "summary";
      label: string;
      meta?: string;
    }
  | {
      kind: "query";
      label: string;
      query: string;
      meta?: string;
      brand?: WebSearchBrand;
      sources?: WebSearchSource[];
    };

export type WebSearchTrace = {
  status: "running" | "complete" | "error";
  steps: WebSearchStep[];
  queriedAt?: string;
  errorMessage?: string;
};

export type WebSearchApiResult = {
  query: string;
  results: WebSearchSource[];
};
