"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { RoomView } from "./server";

export type { RoomView };

// ---- local identity -------------------------------------------------------

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
function subscribeStorage(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

const tokenKey = (code: string) => `room:${code}:token`;
const hostKey = (code: string) => `room:${code}:host`;

/**
 * Player token for a room. Per-tab (sessionStorage) so two tabs can be two
 * players; falls back to localStorage so a reopened tab keeps its seat.
 * `undefined` until hydrated.
 */
export function useRoomTokens(code: string) {
  const token = useSyncExternalStore(
    subscribeStorage,
    () => sessionStorage.getItem(tokenKey(code)) ?? localStorage.getItem(tokenKey(code)),
    () => undefined,
  );
  const host = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem(hostKey(code)),
    () => undefined,
  );
  return { token, host, ready: token !== undefined };
}

export function saveToken(code: string, token: string | null) {
  if (token) {
    sessionStorage.setItem(tokenKey(code), token);
    localStorage.setItem(tokenKey(code), token);
  } else {
    sessionStorage.removeItem(tokenKey(code));
    localStorage.removeItem(tokenKey(code));
    if (lastRoom() === code) rememberRoom(null);
  }
  notify();
}

const LAST_ROOM_KEY = "lastRoom";

/** The room this device was last in, so the site nav can offer a way back. */
export function lastRoom(): string | null {
  try {
    return localStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

export function rememberRoom(code: string | null) {
  try {
    if (code) localStorage.setItem(LAST_ROOM_KEY, code);
    else localStorage.removeItem(LAST_ROOM_KEY);
  } catch {}
}

export function saveHostToken(code: string, hostToken: string) {
  localStorage.setItem(hostKey(code), hostToken);
  notify();
}

/** Remembered name + photo, so you don't retype them for every room. */
export type Profile = { name: string; avatar: string | null; group: "guy" | "girl" | null };

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem("profile") ?? "") as Partial<Profile>;
    return { name: p.name ?? "", avatar: p.avatar ?? null, group: p.group ?? null };
  } catch {
    return { name: localStorage.getItem("hangman:name") ?? "", avatar: null, group: null };
  }
}

export function saveProfile(p: Profile) {
  localStorage.setItem("profile", JSON.stringify(p));
}

// ---- server calls ---------------------------------------------------------

export async function roomAction(
  code: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; [k: string]: unknown } | { ok: false; error: string }> {
  // attach this device's player + host tokens unless the caller set them explicitly
  const stored = storedTokens(code);
  const payload = {
    ...body,
    token: body.token ?? stored.token ?? undefined,
    hostToken: body.hostToken ?? stored.host ?? undefined,
  };
  const res = await fetch(`/api/rooms/${code}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({ error: "Network error" }));
  return res.ok ? { ok: true, ...data } : { ok: false, error: data.error ?? "Something went wrong" };
}

function storedTokens(code: string) {
  if (typeof window === "undefined") return { token: null, host: null };
  return {
    token: sessionStorage.getItem(tokenKey(code)) ?? localStorage.getItem(tokenKey(code)),
    host: localStorage.getItem(hostKey(code)),
  };
}

export async function createRoom(kind: string, options?: Record<string, unknown>) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, options }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  saveHostToken(data.code, data.hostToken);
  return data.code as string;
}

// ---- live room ------------------------------------------------------------

export type StreamStatus = "connecting" | "live" | "reconnecting" | "gone" | "notfound";

/**
 * Live room state. Uses Server-Sent Events; if nothing arrives within a few
 * seconds (some proxies, e.g. Cloudflare quick tunnels, buffer streams) it
 * switches to polling every 1.5s instead. EventSource reconnects on its own.
 */
export function useRoomStream(code: string, opts: { token?: string | null; host?: string | null; enabled: boolean }) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const { token, host, enabled } = opts;

  useEffect(() => {
    if (!enabled) return;
    const q = new URLSearchParams();
    if (token) q.set("token", token);
    if (host) q.set("host", host);

    let stopped = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let gotMessage = false;
    const es = new EventSource(`/api/rooms/${code}/stream?${q}`);

    const startPolling = () => {
      if (poll || stopped) return;
      es.close();
      const tick = async () => {
        const res = await fetch(`/api/rooms/${code}/state?${q}`, { cache: "no-store" }).catch(() => null);
        if (stopped) return;
        if (!res) return setStatus("reconnecting");
        if (res.status === 404) {
          setStatus("notfound");
          return stop();
        }
        if (!res.ok) return; // rate limited etc: try again next tick
        const data = await res.json();
        if (data.gone) {
          setStatus("gone");
          return stop();
        }
        setRoom(data.room);
        setStatus("live");
      };
      tick();
      poll = setInterval(tick, 1500);
    };
    const stop = () => {
      stopped = true;
      es.close();
      if (poll) clearInterval(poll);
    };

    es.onmessage = (e) => {
      gotMessage = true;
      setRoom(JSON.parse(e.data));
      setStatus("live");
    };
    es.addEventListener("gone", () => {
      setStatus("gone");
      stop();
    });
    es.onerror = async () => {
      // distinguish "room vanished" from a network blip
      const res = await fetch(`/api/rooms/${code}`).catch(() => null);
      if (res?.status === 404) {
        setStatus("notfound");
        stop();
      } else if (!gotMessage) startPolling();
      else setStatus("reconnecting");
    };
    // the server sends the room immediately; silence means something is buffering the stream
    const fallback = setTimeout(() => !gotMessage && startPolling(), 5000);

    return () => {
      clearTimeout(fallback);
      stop();
    };
  }, [code, token, host, enabled]);

  return { room, status };
}

// ---- avatars --------------------------------------------------------------

/** Crop to a centred square and shrink to 160px JPEG so it's tiny to upload. */
export async function fileToAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that image"));
      i.src = url;
    });
    const size = 160;
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    canvas
      .getContext("2d")!
      .drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** A proof photo: longest side ~900px, JPEG, squeezed under the server's size limit. */
export async function fileToPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that photo"));
      i.src = url;
    });
    for (const [side, quality] of [
      [900, 0.72],
      [720, 0.65],
      [560, 0.6],
    ] as const) {
      const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", quality);
      if (data.length < 185_000) return data;
    }
    throw new Error("That photo is too big — try another");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---- admin access ---------------------------------------------------------

/** Trade the admin password for host access on this device. */
export async function unlockAdmin(code: string, password: string) {
  const res = await roomAction(code, { type: "unlock", password });
  if (!res.ok) throw new Error(res.error);
  saveHostToken(code, res.hostToken as string);
}

/** New password + host token; every other admin device is signed out. */
export async function resetAdmin(code: string, hostToken?: string) {
  const res = await roomAction(code, { type: "resetAdmin", hostToken });
  if (!res.ok) throw new Error(res.error);
  saveHostToken(code, res.hostToken as string);
}

/** The remembered profile name, safe for SSR (empty on the server). */
export function useProfileName() {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return (JSON.parse(localStorage.getItem("profile") ?? "{}") as { name?: string }).name ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
}
