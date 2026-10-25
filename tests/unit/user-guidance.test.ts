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

  it("learns stated preferences and applies explicit add, update, and forget instructions", () => {
    installStorage();
    expect(
      applyExplicitUserGuidanceCommand("I like concise answers."),
    ).toMatchObject({ action: "added", kind: "rule" });
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

  it("updates a name memory in place and ranks relevant context for the current request", () => {
    installStorage();
    const first = applyExplicitUserGuidanceCommand("My name is Alex Example.");
    const renamed = applyExplicitUserGuidanceCommand("Call me Sam Example.");
    saveUserGuidance("memory", "I am planning a trip to Kyoto.");
    expect(first).toMatchObject({ action: "added", kind: "memory" });
    expect(renamed).toMatchObject({ action: "updated", kind: "memory" });
    expect(
      listUserGuidance().filter((entry) => /name/i.test(entry.content)),
    ).toHaveLength(1);
    const context = buildUserGuidanceContext(undefined, undefined, "Who am I?");
    expect(context?.indexOf("Sam Example")).toBeLessThan(
      context?.indexOf("Kyoto") ?? -1,
    );
  });

  it("never deletes ambiguous matches and reports missing or disabled changes", () => {
    installStorage();
    saveUserGuidance("rule", "Prefer concise technical answers.");
    saveUserGuidance("rule", "Prefer concise examples.");
    expect(
      applyExplicitUserGuidanceCommand("forget my rule about concise"),
    ).toMatchObject({ action: "ambiguous", kind: "rule" });
    expect(listUserGuidance()).toHaveLength(2);
    expect(
      applyExplicitUserGuidanceCommand("forget my memory about a dog"),
    ).toMatchObject({ action: "not_found", kind: "memory" });
    setUserGuidanceEnabled(false);
    expect(
      applyExplicitUserGuidanceCommand("Remember that I like short answers."),
    ).toMatchObject({ action: "disabled" });
  });

  it("supports explicit bulk removal without deleting the other category", () => {
    installStorage();
    saveUserGuidance("memory", "I am a designer.");
    saveUserGuidance("rule", "Prefer concise answers.");
    expect(
      applyExplicitUserGuidanceCommand("forget all my memories"),
    ).toMatchObject({
      action: "removed",
      kind: "memory",
      count: 1,
    });
    expect(listUserGuidance().map((entry) => entry.kind)).toEqual(["rule"]);
    expect(
      applyExplicitUserGuidanceCommand("delete all profile guidance"),
    ).toMatchObject({
      action: "removed",
      kind: "all",
      count: 1,
    });
    expect(listUserGuidance()).toEqual([]);
  });

  it("keeps profile data out of context when disabled and labels it as guidance", () => {
    installStorage();
    saveUserGuidance("rule", "Always answer in plain language.");
    setUserGuidanceEnabled(false);

    expect(isUserGuidanceEnabled()).toBe(false);
    expect(
      applyExplicitUserGuidanceCommand("Remember that I like short answers."),
    ).toMatchObject({ action: "disabled" });
    expect(buildUserGuidanceContext()).toContain("PROFILE GUIDANCE DISABLED");
    expect(buildUserGuidanceContext()).not.toContain(
      "Always answer in plain language.",
    );
    clearUserGuidance();
    expect(listUserGuidance()).toEqual([]);
  });
});
