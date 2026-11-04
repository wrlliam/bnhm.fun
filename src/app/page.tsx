"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createRoom } from "@/lib/rooms/client";

const ROOM_GAMES = [
  {
    kind: "ring-of-fire",
    name: "Ring of Fire",
    blurb: "Draw on your phone, the card shows on the TV, and phones buzz when someone has to drink.",
  },
  {
    kind: "most-likely-to",
    name: "Most Likely To",
    blurb: "Everyone votes in secret on their phone. One sip per vote you get.",
  },
  {
    kind: "hangman",
    name: "Hangman",
    blurb: "One person picks a word, everyone else guesses letters.",
  },
] as const;

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const c = code.trim().toUpperCase();
    if (c.length !== 4) return setError("Room codes are 4 letters.");
    setBusy("join");
    const res = await fetch(`/api/rooms/${c}`).catch(() => null);
    if (!res?.ok) {
      setBusy(null);
      return setError(res?.status === 404 ? `No room with code ${c}.` : "Couldn't reach the server.");
    }
    router.push(`/r/${c}`);
  }

  async function create(kind: string) {
    setError("");
    setBusy(kind);
    try {
      router.push(`/r/${await createRoom(kind)}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14 sm:pl-20">
      <h1 className="font-hand text-7xl font-bold leading-none">Game night</h1>
      <p className="mt-2 text-faint">Start a room, share the code, and everyone plays on their own phone. Put it on the TV too.</p>

      <form onSubmit={join} className="mt-10 max-w-md">
        <label htmlFor="code" className="text-sm font-medium">
          Got a code? Join a room
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            maxLength={4}
            placeholder="CODE"
            autoComplete="off"
            className="w-0 flex-1 rounded-md border-2 border-ink bg-paper px-3 py-3 text-center font-mono text-3xl tracking-[0.4em] outline-none placeholder:text-faint/50"
          />
          <button
            disabled={busy !== null}
            className="rounded-md bg-ink px-6 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
          >
            Join
          </button>
        </div>
        <p className="mt-1 text-xs text-faint">
          Next you&rsquo;ll pick a name and, if you like, a photo. Setting up a TV?{" "}
          <Link href="/tv" className="text-ink underline underline-offset-2">
            Open the TV screen
          </Link>
        </p>
      </form>
      {error && <p className="pop mt-3 text-sm text-miss">{error}</p>}

      <h2 className="mt-14 text-sm font-medium">Or start a room</h2>
      <p className="text-xs text-faint">
        You&rsquo;ll be the host. You get a code to share and a TV / admin panel to open on a big screen.
      </p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-3">
        {ROOM_GAMES.map((g) => (
          <li key={g.kind} className="flex flex-col rounded-xl border-2 border-ink bg-surface p-5 shadow-sm">
            <span className="font-hand text-3xl font-bold">{g.name}</span>
            <span className="mt-1 flex-1 text-sm text-faint">{g.blurb}</span>
            <button
              onClick={() => create(g.kind)}
              disabled={busy !== null}
              className="mt-4 rounded-md bg-ink py-2 text-sm font-medium text-paper transition hover:bg-ink/90 disabled:opacity-50"
            >
              {busy === g.kind ? "Creating…" : "Start a room"}
            </button>
            <Link
              href={`/how-to-play/${g.kind}`}
              className="mt-2 text-center text-xs text-faint underline underline-offset-4 hover:text-ink"
            >
              How to play
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-12 text-sm text-faint">
        Just one phone on the table?{" "}
        <Link href="/party" className="text-ink underline underline-offset-4">
          Pass-the-phone card games
        </Link>{" "}
        ·{" "}
        <Link href="/how-to-play" className="text-ink underline underline-offset-4">
          Rules for every game
        </Link>
      </p>
    </main>
  );
}
