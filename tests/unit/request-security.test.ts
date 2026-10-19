import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { protectApiRequest } from "@/lib/server/request-security";

describe("protectApiRequest origin verification", () => {
  it("allows same-origin requests matching host header", () => {
    const req = new NextRequest("http://127.0.0.1:3000/api/web-search", {
      method: "POST",
      headers: {
        origin: "http://127.0.0.1:3000",
        host: "127.0.0.1:3000",
      },
    });

    const res = protectApiRequest(req, {
      limit: 10,
      windowMs: 60_000,
      scope: "test-origin",
    });

    expect(res).toBeNull();
  });

  it("allows requests from Vercel edge where origin is https but internal url is http", () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        origin: "https://my-aibot.vercel.app",
        "x-forwarded-host": "my-aibot.vercel.app",
        "x-forwarded-proto": "https",
        host: "localhost:3000",
      },
    });

    const res = protectApiRequest(req, {
      limit: 10,
      windowMs: 60_000,
      scope: "test-vercel-origin",
    });

    expect(res).toBeNull();
  });

  it("allows requests matching VERCEL_URL environment variable", () => {
    process.env.VERCEL_URL = "preview-deployment.vercel.app";

    const req = new NextRequest("http://10.0.0.1:3000/api/web-search", {
      method: "POST",
      headers: {
        origin: "https://preview-deployment.vercel.app",
        host: "10.0.0.1:3000",
      },
    });

    const res = protectApiRequest(req, {
      limit: 10,
      windowMs: 60_000,
      scope: "test-vercel-env",
    });

    expect(res).toBeNull();
    delete process.env.VERCEL_URL;
  });

  it("blocks genuine cross-origin attacker requests", () => {
    const req = new NextRequest("http://localhost:3000/api/web-search", {
      method: "POST",
      headers: {
        origin: "https://malicious-site.com",
        host: "localhost:3000",
      },
    });

    const res = protectApiRequest(req, {
      limit: 10,
      windowMs: 60_000,
      scope: "test-attacker",
    });

    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });
});
