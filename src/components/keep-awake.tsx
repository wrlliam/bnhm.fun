"use client";

import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

/** Holds a screen wake lock while the page is visible and the setting is on. */
export function KeepAwake() {
  const { keepAwake } = useSettings();
  useEffect(() => {
    if (!keepAwake || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        lock = await navigator.wakeLock.request("screen");
        if (cancelled) void lock.release();
      } catch {
        // denied (battery saver, unsupported context): nothing to do
      }
    };
    const onVisible = () => document.visibilityState === "visible" && acquire();
    acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release();
    };
  }, [keepAwake]);
  return null;
}
