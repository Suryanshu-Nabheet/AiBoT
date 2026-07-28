/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export const LONG_TASK_MS = 8_000;

export type DesktopNotifyPayload = {
  title: string;
  body: string;
  tag?: string;
};

export function supportsDesktopNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!supportsDesktopNotifications()) return "unsupported";
  return Notification.permission;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!supportsDesktopNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

export function showDesktopNotification(payload: DesktopNotifyPayload): boolean {
  if (!supportsDesktopNotifications()) return false;
  if (Notification.permission !== "granted") return false;

  // Only nudge when the user isn't already looking at the tab.
  if (typeof document !== "undefined" && document.visibilityState === "visible") {
    return false;
  }

  try {
    const notification = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag ?? "aibot-complete",
      silent: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    return false;
  }
}

/** Soft UI chime via Web Audio — no asset file required. */
export function playCompletionChime() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const tone = (freq: number, start: number, duration: number, gain = 0.04) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    tone(880, now, 0.12);
    tone(1174.7, now + 0.1, 0.18);
    void ctx.resume();
    setTimeout(() => void ctx.close(), 600);
  } catch {
    // Audio may be blocked until a user gesture; ignore silently.
  }
}
