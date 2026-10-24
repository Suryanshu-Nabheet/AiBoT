"use client";

import { useEffect, useState } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_USER_GUIDANCE_ENTRIES_PER_KIND,
  isUserGuidanceEnabled,
  listUserGuidance,
  removeUserGuidance,
  saveUserGuidance,
  setUserGuidanceEnabled,
  type UserGuidanceEntry,
  type UserGuidanceKind,
} from "@/lib/chat/user-guidance";
import { useTranslation } from "@/hooks/use-translation";

export function UserGuidanceManager() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<UserGuidanceEntry[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [drafts, setDrafts] = useState<Record<UserGuidanceKind, string>>({
    memory: "",
    rule: "",
  });
  const [editing, setEditing] = useState<{
    id: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    setEntries(listUserGuidance());
    setEnabled(isUserGuidanceEnabled());
    const syncFromAnotherTab = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === "aibot-user-guidance-v1" ||
        event.key === "aibot-user-guidance-enabled"
      ) {
        setEntries(listUserGuidance());
        setEnabled(isUserGuidanceEnabled());
      }
    };
    window.addEventListener("storage", syncFromAnotherTab);
    return () => window.removeEventListener("storage", syncFromAnotherTab);
  }, []);

  const updateEnabled = (value: boolean) => {
    setEnabled(value);
    setUserGuidanceEnabled(value);
  };

  const addEntry = (kind: UserGuidanceKind) => {
    try {
      saveUserGuidance(kind, drafts[kind]);
      setEntries(listUserGuidance());
      setDrafts((current) => ({ ...current, [kind]: "" }));
      toast.success(t("general.guidance.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("general.guidance.saveFailed"),
      );
    }
  };

  const saveEdit = () => {
    if (!editing) return;
    try {
      saveUserGuidance(
        entries.find((entry) => entry.id === editing.id)?.kind ?? "memory",
        editing.content,
        editing.id,
      );
      setEntries(listUserGuidance());
      setEditing(null);
      toast.success(t("general.guidance.saved"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("general.guidance.saveFailed"),
      );
    }
  };

  const removeEntry = (entry: UserGuidanceEntry) => {
    if (!window.confirm(t("general.guidance.confirmRemove"))) return;
    try {
      removeUserGuidance(entry.id);
      setEntries(listUserGuidance());
      if (editing?.id === entry.id) setEditing(null);
    } catch {
      toast.error(t("general.guidance.saveFailed"));
    }
  };

  const renderGroup = (kind: UserGuidanceKind) => {
    const groupEntries = entries.filter((entry) => entry.kind === kind);
    const isRule = kind === "rule";
    const title = isRule
      ? t("general.guidance.rules")
      : t("general.guidance.memories");
    const full = groupEntries.length >= MAX_USER_GUIDANCE_ENTRIES_PER_KIND;

    return (
      <section key={kind} className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-[13px] font-medium text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground">
              {t("general.guidance.entryCount", {
                count: groupEntries.length,
                max: MAX_USER_GUIDANCE_ENTRIES_PER_KIND,
              })}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {groupEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-border/50 bg-background/60 p-3"
            >
              {editing?.id === entry.id ? (
                <div className="space-y-2">
                  <Textarea
                    aria-label={t("general.guidance.editLabel", { title })}
                    maxLength={500}
                    rows={3}
                    value={editing.content}
                    onChange={(event) =>
                      setEditing({ ...editing, content: event.target.value })
                    }
                    className="min-h-20 resize-y rounded-md border border-border/60 text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(null)}
                    >
                      {t("general.guidance.cancel")}
                    </Button>
                    <Button type="button" size="sm" onClick={saveEdit}>
                      {t("general.guidance.save")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
                    {entry.content}
                  </p>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={t("general.guidance.editLabel", { title })}
                      onClick={() =>
                        setEditing({ id: entry.id, content: entry.content })
                      }
                    >
                      <PencilSimple className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={t("general.guidance.removeLabel", { title })}
                      onClick={() => removeEntry(entry)}
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {groupEntries.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
              {t("general.guidance.empty", { title: title.toLowerCase() })}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Textarea
            aria-label={t("general.guidance.draftLabel", { title })}
            placeholder={
              isRule
                ? t("general.guidance.rulePlaceholder")
                : t("general.guidance.memoryPlaceholder")
            }
            maxLength={500}
            rows={2}
            value={drafts[kind]}
            onChange={(event) =>
              setDrafts((current) => ({
                ...current,
                [kind]: event.target.value,
              }))
            }
            className="min-h-16 resize-y rounded-md border border-border/60 text-sm"
          />
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={full || drafts[kind].trim().length < 3}
              onClick={() => addEntry(kind)}
            >
              {t("general.guidance.add", { title: title.toLowerCase() })}
            </Button>
          </div>
          {full ? (
            <p className="text-xs text-muted-foreground">
              {t("general.guidance.limit", {
                max: MAX_USER_GUIDANCE_ENTRIES_PER_KIND,
              })}
            </p>
          ) : null}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("general.guidance.title")}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("general.guidance.description")}
        </p>
      </div>
      <section
        aria-label={t("general.guidance.title")}
        className="rounded-xl border border-border/60 bg-card"
      >
        <div className="flex items-center justify-between gap-4 border-b border-border/40 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-foreground">
              {t("general.guidance.enabled")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("general.guidance.enabledDescription")}
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={updateEnabled}
            aria-label={t("general.guidance.enabled")}
          />
        </div>
        <div className="space-y-6 p-4">
          {renderGroup("memory")}
          <div className="border-t border-border/40" />
          {renderGroup("rule")}
        </div>
      </section>
    </div>
  );
}
