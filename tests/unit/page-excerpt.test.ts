import { describe, expect, it } from "vitest";
import { isSafePublicHttpUrl } from "@/lib/server/web-search/page-excerpt";

describe("isSafePublicHttpUrl", () => {
  it("allows public https URLs", () => {
    expect(isSafePublicHttpUrl("https://example.com/path")).toBe(true);
  });

  it("blocks localhost and private networks", () => {
    expect(isSafePublicHttpUrl("http://localhost/")).toBe(false);
    expect(isSafePublicHttpUrl("http://127.0.0.1/")).toBe(false);
    expect(isSafePublicHttpUrl("http://192.168.0.1/")).toBe(false);
  });
});
