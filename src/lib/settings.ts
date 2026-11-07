"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, type Season, SEASON_PREVIEW_KEY, seasonFor, SEASONS, type Settings, SETTINGS_KEY } from "./settings-shared";

export { alertWords, DEFAULT_SETTINGS, type Season, type Settings } from "./settings-shared";

/** Today's season (or a ?season= preview in this tab), ignoring the on/off setting. */
function seasonToday(): Season | null {
  let preview: string | null = null;
  try {
    preview = sessionStorage.getItem(SEASON_PREVIEW_KEY);
  } catch {}
  if (preview) return SEASONS.includes(preview as Season) ? (preview as Season) : null;
  return seasonFor(new Date());
}

const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cache: Settings = DEFAULT_SETTINGS;

function read(): Settings {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SETTINGS_KEY);
  } catch {}
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
    } catch {
      cache = DEFAULT_SETTINGS;
    }
  }
  return cache;
}

function apply(s: Settings) {
  const d = document.documentElement;
  d.dataset.text = s.textSize;
  d.dataset.motion = s.motion ? "on" : "off";
  const season = s.seasonal ? seasonToday() : null;
  if (season) d.dataset.season = season;
  else delete d.dataset.season;
}

export function updateSettings(patch: Partial<Settings>) {
  const next = { ...read(), ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  apply(next);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_SETTINGS);
}

/** Read once outside React (e.g. inside an event handler). */
export const getSettings = () => (typeof window === "undefined" ? DEFAULT_SETTINGS : read());

/** The seasonal look showing right now (null when it's off or out of season). */
export function useSeason(): Season | null {
  const s = useSettings();
  return useSyncExternalStore(
    subscribe,
    () => (s.seasonal ? seasonToday() : null),
    () => null,
  );
}

/** Whether there's a seasonal look to switch on or off today (for the settings toggle). */
export const seasonAvailable = () => (typeof window === "undefined" ? null : seasonToday());
