"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { unlockAdmin } from "@/lib/rooms/client";

/** Entry point for a TV / second screen: room code, plus the admin password to control it. */
export default function TvEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <form
        className="w-full max-w-md"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const c = code.trim().toUpperCase();
          if (c.length !== 4) return setError("Room codes are 4 letters.");
          setBusy(true);
          try {
            const res = await fetch(`/api/rooms/${c}`);
            if (!res.ok) throw new Error(res.status === 404 ? `No room with code ${c}.` : "Couldn't reach the server.");
            if (password.trim()) await unlockAdmin(c, password);
            router.push(`/tv/${c}`);
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <h1 className="font-hand text-6xl font-bold">TV screen</h1>
        <p className="mt-2 text-faint">Show a room on this screen. Add the admin password to control the game from here too.</p>

        <label htmlFor="tv-code" className="mt-8 block text-sm font-medium">
          Room code
        </label>
        <input
          id="tv-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          maxLength={4}
          placeholder="CODE"
          autoComplete="off"
          className="mt-1 w-full rounded-md border-2 border-ink bg-paper px-3 py-3 text-center font-mono text-4xl tracking-[0.4em] outline-none placeholder:text-faint/50"
        />

        <label htmlFor="tv-pw" className="mt-6 block text-sm font-medium">
          Admin password <span className="font-normal text-faint">(optional — leave blank to just watch)</span>
        </label>
        <input
          id="tv-pw"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="xxxx-xxxx-xxxx"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="mt-1 w-full rounded-md border-2 border-ink bg-paper px-3 py-3 text-center font-mono text-2xl tracking-wider outline-none placeholder:text-faint/50"
        />

        <button
          disabled={busy}
          className="mt-8 w-full rounded-md bg-ink py-4 text-lg font-medium text-paper hover:bg-ink/90 disabled:opacity-50"
        >
          {busy ? "Opening…" : "Open"}
        </button>
        {error && <p className="pop mt-4 text-sm text-miss">{error}</p>}
      </form>
    </main>
  );
}
