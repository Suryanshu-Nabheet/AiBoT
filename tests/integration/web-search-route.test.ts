import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { searchWeb } from "@/lib/server/web-search/search";
import { POST } from "@/app/api/web-search/route";

vi.mock("@/lib/server/web-search/search", () => ({
  searchWeb: vi.fn(async (query: string) => {
    if (query === "provider-failure") throw new Error("provider failed");
    if (query === "empty-query") {
      return { query, results: [], status: "complete" };
    }
    return {
      query,
      status: "complete",
      results: [
        {
          title: "Result Title",
          href: "https://example.com/item",
          domain: "example.com",
          brand: "generic",
        },
      ],
    };
  }),
}));

describe("POST /api/web-search route", () => {
  it("returns 200 with search batches when results are found", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({
        query: "Search the web for test query",
        force: true,
        maxResults: 5,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].results).toHaveLength(1);
    expect(data.batches[0].results[0].title).toBe("Result Title");
    expect(data.batches[0].query).toBe("test query");
  });

  it("strips answer-formatting instructions before provider queries", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({
        query:
          "Please use web search to research the latest AI agent frameworks and compare Vercel AI SDK with LangGraph, then write a comprehensive recommendation report with code samples, citations, and a conclusion. Focus on the factual differences.",
        force: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    const submittedQueries = data.batches.map(
      (batch: { query: string }) => batch.query,
    );
    expect(res.status).toBe(200);
    expect(submittedQueries.join(" ")).toContain("Vercel AI SDK");
    expect(submittedQueries.join(" ")).toContain("LangGraph");
    expect(submittedQueries.join(" ")).not.toMatch(
      /recommendation report|code samples|citations/i,
    );
  });

  it("limits page-excerpt fetching to one top source per query", async () => {
    vi.mocked(searchWeb).mockClear();
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({
        query: "latest official React 19 updates",
        force: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(vi.mocked(searchWeb).mock.calls[0]?.[2]).toMatchObject({
      enrichPageExcerpts: true,
      maxExcerptPages: 1,
    });
  });

  it("returns 200 gracefully without 502 error when search produces no results", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({
        query: "empty-query",
        force: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].results).toHaveLength(0);
  });

  it("reports a provider outage instead of presenting it as an empty search", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({ query: "provider-failure", force: true }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.batches[0]).toMatchObject({
      query: "provider-failure",
      results: [],
      status: "error",
    });
    expect(data.batches[0].errorMessage).toContain("timed out");
  });

  it("does not accept client-supplied raw query arrays", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({ queries: ["the entire user prompt"] }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("skips greetings instead of searching when web search is enabled", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({ query: "hi" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ batches: [], skipped: true });
  });

  it("returns 400 for invalid body schema", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({
        queries: [], // Empty queries array is rejected by schema
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
