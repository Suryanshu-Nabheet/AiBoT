import { describe, expect, it } from "vitest";
import { getOllamaTargetAddressSpace } from "@/lib/chat/ollama-url";

describe("getOllamaTargetAddressSpace", () => {
  it("does not add a secure-origin hint to a local HTTP development app", () => {
    expect(
      getOllamaTargetAddressSpace("http://localhost:11434/api/chat", "http:"),
    ).toBeUndefined();
  });

  it("uses the loopback address space for localhost Ollama from HTTPS", () => {
    expect(
      getOllamaTargetAddressSpace("http://localhost:11434/api/chat", "https:"),
    ).toBe("loopback");
    expect(
      getOllamaTargetAddressSpace("http://127.0.0.1:11434/api/chat", "https:"),
    ).toBe("loopback");
  });

  it("uses the local address space for private LAN Ollama endpoints", () => {
    expect(
      getOllamaTargetAddressSpace(
        "http://192.168.1.25:11434/api/chat",
        "https:",
      ),
    ).toBe("local");
    expect(
      getOllamaTargetAddressSpace(
        "http://ollama.local:11434/api/chat",
        "https:",
      ),
    ).toBe("local");
  });

  it("does not mislabel public Ollama hosts as local", () => {
    expect(
      getOllamaTargetAddressSpace(
        "https://ollama.example.com/api/chat",
        "https:",
      ),
    ).toBeUndefined();
  });
});
