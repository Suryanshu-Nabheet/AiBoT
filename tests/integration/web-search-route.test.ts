import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/web-search/route";

vi.mock("@/lib/server/web-search/search", () => ({
  searchWeb: vi.fn(async (query: string) => {
    if (query === "empty-query") {
      return { query, results: [] };
    }
    return {
      query,
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
        queries: ["test query"],
        maxResults: 5,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].results).toHaveLength(1);
    expect(data.batches[0].results[0].title).toBe("Result Title");
  });

  it("returns 200 gracefully without 502 error when search produces no results", async () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "localhost:3000",
      },
      body: JSON.stringify({
        queries: ["empty-query"],
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.batches).toHaveLength(1);
    expect(data.batches[0].results).toHaveLength(0);
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
