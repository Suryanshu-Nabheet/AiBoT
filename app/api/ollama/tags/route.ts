/**
 * Same-origin proxy for Ollama /api/tags when the app runs on the same machine
 * as Ollama (local dev or self-hosted). Not used for remote Vercel → user laptop.
 */

import { NextRequest, NextResponse } from "next/server";
import { normalizeOllamaUrl } from "@/lib/chat/ollama-url";
import { protectApiRequest } from "@/lib/server/request-security";

function isAllowedOllamaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "host.docker.internal"
  );
}

export async function GET(req: NextRequest) {
  const denied = protectApiRequest(req, {
    limit: 30,
    windowMs: 60_000,
    scope: "ollama-tags",
  });
  if (denied) return denied;

  const baseParam = req.nextUrl.searchParams.get("base");
  const base = normalizeOllamaUrl(
    baseParam ?? process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  );

  let host: string;
  try {
    host = new URL(base).hostname;
  } catch {
    return NextResponse.json({ error: "Invalid Ollama URL" }, { status: 400 });
  }

  if (!isAllowedOllamaHost(host)) {
    return NextResponse.json(
      { error: "Ollama host must be local loopback" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/tags`, {
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ollama proxy /api/tags failed:", error);
    return NextResponse.json(
      { error: "Could not reach Ollama from app server" },
      { status: 502 },
    );
  }
}
