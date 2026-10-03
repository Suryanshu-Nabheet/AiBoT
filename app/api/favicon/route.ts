import { NextRequest, NextResponse } from "next/server";
import { faviconUpstreamUrl } from "@/lib/web-search/favicon";
import { protectApiRequest } from "@/lib/server/request-security";

export const maxDuration = 10;

export async function GET(req: NextRequest) {
  const blocked = protectApiRequest(req, {
    scope: "favicon",
    limit: 120,
    windowMs: 60_000,
  });
  if (blocked) return blocked;

  const domain = req.nextUrl.searchParams.get("d")?.trim();
  if (!domain || domain.length > 253) {
    return new NextResponse(null, { status: 400 });
  }

  const size = Math.min(
    128,
    Math.max(16, Number(req.nextUrl.searchParams.get("sz")) || 64),
  );

  try {
    const upstream = await fetch(faviconUpstreamUrl(domain, size), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AiBoT/1.0; +https://github.com/Suryanshu-Nabheet/AiBoT)",
      },
      cache: "force-cache",
      next: { revalidate: 86400 },
    });

    if (!upstream.ok) {
      return new NextResponse(null, { status: 502 });
    }

    const bytes = await upstream.arrayBuffer();
    const contentType = upstream.headers.get("content-type") ?? "image/png";

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
