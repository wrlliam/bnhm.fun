"use client";

import { useState } from "react";
import { resetAdmin, type RoomView, unlockAdmin } from "@/lib/rooms/client";

/** Host-only: the admin password and how to use it on another device. */
export function AdminAccess({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false); // hidden until tapped, so it can't be read over your shoulder
  if (!room.isHost || !room.adminPassword) return null;
  const tvUrl = typeof window === "undefined" ? `/tv/${room.code}` : `${location.host}/tv/${room.code}`;

  return (
    <div className="rounded-xl border-2 border-dashed border-ink/40 bg-surface p-4 text-sm">
      <p className="font-medium">Admin password</p>
      <p className="text-faint">
        To control the game from another device (like a TV), open <span className="font-mono text-ink">{tvUrl}</span>{" "}
        there, tap <em>Admin login</em> and enter:
      </p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 rounded-md bg-ink/5 px-3 py-2 text-center font-mono text-xl tracking-wider">
          {shown ? room.adminPassword : "••••-••••-••••"}
        </code>
        <button onClick={() => setShown((s) => !s)} className="text-xs underline underline-offset-2">
          {shown ? "Hide" : "Show"}
        </button>
        <button
          onClick={async () => {
            await navigator.clipboard?.writeText(room.adminPassword!);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="text-xs underline underline-offset-2"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-xs text-faint">
        Keep it to yourself. Anyone with it can run the game.{" "}
        <button
          onClick={async () => {
            if (!confirm("Make a new admin password? Every other device using the old one loses admin controls.")) return;
            try {
              await resetAdmin(room.code, hostToken ?? undefined);
            } catch (e) {
              alert((e as Error).message);
            }
          }}
          className="underline underline-offset-2 hover:text-miss"
        >
          Change password &amp; sign out other admin devices
        </button>
      </p>
    </div>
  );
}

/** On a device that isn't admin yet: enter the password to unlock host controls. */
export function AdminLogin({ code, onDone }: { code: string; onDone?: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await unlockAdmin(code, password);
          onDone?.();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="xxxx-xxxx-xxxx"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-label="Admin password"
        className="w-52 rounded-md border-2 border-ink/25 transition-colors focus:border-ink bg-paper px-3 py-2 font-mono tracking-wider outline-none"
      />
      <button
        disabled={busy || !password.trim()}
        className="rounded-md bg-ink px-4 py-2 font-medium text-paper hover:bg-ink/90 disabled:opacity-40"
      >
        Unlock
      </button>
      {error && <p className="w-full text-sm text-miss">{error}</p>}
    </form>
  );
}
