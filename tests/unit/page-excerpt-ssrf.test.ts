import { EventEmitter } from "node:events";
import type { LookupAddress } from "node:dns";
import type { IncomingHttpHeaders, RequestOptions } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { lookupMock, httpRequestMock, httpsRequestMock, responses } = vi.hoisted(
  () => ({
    lookupMock: vi.fn(),
    httpRequestMock: vi.fn(),
    httpsRequestMock: vi.fn(),
    responses: [] as {
      statusCode: number;
      headers: IncomingHttpHeaders;
      body?: string;
    }[],
  }),
);

vi.mock("node:dns/promises", () => ({ lookup: lookupMock }));
vi.mock("node:http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:http")>();
  return { ...actual, request: httpRequestMock };
});
vi.mock("node:https", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:https")>();
  return { ...actual, request: httpsRequestMock };
});

import { fetchPageExcerpt } from "@/lib/server/web-search/page-excerpt";

function mockRequest(
  _url: URL,
  _options: RequestOptions,
  callback: (
    response: EventEmitter & {
      statusCode: number;
      headers: IncomingHttpHeaders;
      destroy: () => void;
    },
  ) => void,
) {
  const request = new EventEmitter() as EventEmitter & {
    setTimeout: ReturnType<typeof vi.fn>;
    end: () => void;
    destroy: (error?: Error) => void;
  };
  request.setTimeout = vi.fn();
  request.end = () => {
    const next = responses.shift();
    if (!next) throw new Error("No mock page response queued");
    queueMicrotask(() => {
      const response = new EventEmitter() as EventEmitter & {
        statusCode: number;
        headers: IncomingHttpHeaders;
        destroy: () => void;
      };
      response.statusCode = next.statusCode;
      response.headers = next.headers;
      response.destroy = vi.fn();
      callback(response);
      if (next.statusCode >= 200 && next.statusCode < 300) {
        response.emit("data", Buffer.from(next.body ?? ""));
        response.emit("end");
      }
    });
  };
  request.destroy = (error) => {
    if (error) request.emit("error", error);
  };
  return request;
}

describe("page excerpt SSRF boundary", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 } satisfies LookupAddress,
    ]);
    httpRequestMock.mockReset();
    httpRequestMock.mockImplementation(mockRequest);
    httpsRequestMock.mockReset();
    httpsRequestMock.mockImplementation(mockRequest);
    responses.length = 0;
  });

  it("rejects a hostname if any DNS answer is private", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ]);

    await expect(fetchPageExcerpt("https://mixed.example/page")).resolves.toBe(
      undefined,
    );
    expect(httpRequestMock).not.toHaveBeenCalled();
  });

  it("revalidates redirects before making the next request", async () => {
    responses.push({
      statusCode: 302,
      headers: { location: "http://127.0.0.1/admin" },
    });

    await expect(
      fetchPageExcerpt("https://public.example/start"),
    ).resolves.toBe(undefined);
    expect(httpsRequestMock).toHaveBeenCalledOnce();
    expect(httpRequestMock).not.toHaveBeenCalled();
  });

  it("pins the request to the address that passed DNS validation", async () => {
    responses.push({
      statusCode: 200,
      headers: { "content-type": "text/html" },
      body: "<main><p>Public page content for the excerpt.</p></main>",
    });

    const excerpt = await fetchPageExcerpt("https://public.example/article");
    expect(excerpt).toContain("Public page content");
    const options = httpsRequestMock.mock.calls[0]?.[1] as RequestOptions;
    const pinnedLookup = options.lookup;
    expect(pinnedLookup).toBeTypeOf("function");
    const resolved = await new Promise<LookupAddress[]>((resolve, reject) => {
      if (!pinnedLookup) return reject(new Error("Missing pinned lookup"));
      pinnedLookup("public.example", { all: true }, (error, addresses) =>
        error ? reject(error) : resolve(addresses as LookupAddress[]),
      );
    });
    expect(resolved).toEqual([{ address: "93.184.216.34", family: 4 }]);
  });
});
