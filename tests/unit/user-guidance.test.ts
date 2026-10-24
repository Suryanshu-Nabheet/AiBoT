import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyExplicitUserGuidanceCommand,
  buildUserGuidanceContext,
  clearUserGuidance,
  isUserGuidanceEnabled,
  listUserGuidance,
  removeUserGuidance,
  resetUserGuidanceForTests,
  saveUserGuidance,
  setUserGuidanceEnabled,
} from "@/lib/chat/user-guidance";

const values = new Map<string, string>();

function installStorage() {
  values.clear();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });
}

describe("user profile memories and rules", () => {
  afterEach(() => {
    resetUserGuidanceForTests();
    vi.unstubAllGlobals();
  });

  it("creates, edits, and removes bounded profile entries", () => {
    installStorage();
    const saved = saveUserGuidance("memory", "I am a product designer.");
    const edited = saveUserGuidance(
      "rule",
      "Prefer concise answers.",
      saved.id,
    );

    expect(edited.id).toBe(saved.id);
    expect(edited.kind).toBe("rule");
    expect(listUserGuidance()).toEqual([edited]);
    removeUserGuidance(edited.id);
    expect(listUserGuidance()).toEqual([]);
  });

  it("applies only explicit add, update, and forget instructions", () => {
    installStorage();
    expect(applyExplicitUserGuidanceCommand("I like concise answers.")).toBe(
      null,
    );
    const added = applyExplicitUserGuidanceCommand(
      "Remember that I am a UX designer.",
    );
    expect(added).toMatchObject({ action: "added", kind: "memory" });

    const rule = applyExplicitUserGuidanceCommand(
      "Please add a rule: Always give concise answers with an example.",
    );
    expect(rule).toMatchObject({ action: "added", kind: "rule" });
    const updated = applyExplicitUserGuidanceCommand(
      'update my rule from "Always give concise answers with an example." to "Always give concise answers with a short example."',
    );
    expect(updated).toMatchObject({ action: "updated", kind: "rule" });
    const removed = applyExplicitUserGuidanceCommand(
      "forget my rule about concise answers with a short example",
    );
    expect(removed).toMatchObject({
      action: "removed",
      kind: "rule",
      count: 1,
    });
  });

  it("keeps profile data out of context when disabled and labels it as guidance", () => {
    installStorage();
    saveUserGuidance("rule", "Always answer in plain language.");
    setUserGuidanceEnabled(false);

    expect(isUserGuidanceEnabled()).toBe(false);
    expect(
      applyExplicitUserGuidanceCommand("Remember that I like short answers."),
    ).toBeNull();
    expect(buildUserGuidanceContext()).toContain("PROFILE GUIDANCE DISABLED");
    expect(buildUserGuidanceContext()).not.toContain(
      "Always answer in plain language.",
    );
    clearUserGuidance();
    expect(listUserGuidance()).toEqual([]);
  });
});
