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
    expect(isSafePublicHttpUrl("http://10.10.10.10/")).toBe(false);
    expect(isSafePublicHttpUrl("http://172.20.1.1/")).toBe(false);
    expect(
      isSafePublicHttpUrl("http://169.254.169.254/latest/meta-data/"),
    ).toBe(false);
    expect(isSafePublicHttpUrl("http://[::1]/")).toBe(false);
    expect(isSafePublicHttpUrl("http://[fc00::1]/")).toBe(false);
    expect(isSafePublicHttpUrl("http://[fe80::1]/")).toBe(false);
  });

  it("rejects protocol confusion, credentials, and nonstandard ports", () => {
    expect(isSafePublicHttpUrl("file:///etc/passwd")).toBe(false);
    expect(isSafePublicHttpUrl("https://user:pass@example.com/")).toBe(false);
    expect(isSafePublicHttpUrl("http://example.com:8080/")).toBe(false);
  });

  it("blocks alternate IP spellings after URL canonicalization", () => {
    expect(isSafePublicHttpUrl("http://0177.0.0.1/")).toBe(false);
    expect(isSafePublicHttpUrl("http://2130706433/")).toBe(false);
  });
});
