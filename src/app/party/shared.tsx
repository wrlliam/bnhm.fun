"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { MAX_PLAYERS, newSeed, shuffle } from "@/lib/cards";

/**
 * Game state lives entirely in the URL (seed + moves + players), so the
 * current link always reproduces the exact same deck and position.
 */
export function useDeckGame() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const seed = params.get("s");
  const moves = (params.get("m") ?? "").replace(/[^A-Za-z.]/g, "").slice(0, 200);
  const players = (params.get("p") ?? "")
    .split(",")
    .map((n) => n.trim().slice(0, 20))
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);
  const deck = useMemo(() => (seed ? shuffle(seed) : []), [seed]);

  function go(next: { s: string; m: string; p: string[] }) {
    const q = new URLSearchParams({ s: next.s, m: next.m });
    if (next.p.length) q.set("p", next.p.join(","));
    router.replace(`${pathname}?${q}`, { scroll: false });
  }

  return {
    seed,
    moves,
    players,
    deck,
    /** Append a move character ("." for a plain draw, or a game-specific letter). */
    push: (move: string) => seed && go({ s: seed, m: moves + move, p: players }),
    undo: () => seed && go({ s: seed, m: moves.slice(0, -1), p: players }),
    reshuffle: () => go({ s: newSeed(), m: "", p: players }),
    start: (p: string[]) => go({ s: newSeed(), m: "", p }),
    reset: () => router.replace(pathname),
  };
}

export function GameShell({
  title,
  children,
  drinking = true,
}: {
  title: string;
  children: React.ReactNode;
  drinking?: boolean;
}) {
  const pathname = usePathname();
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:pl-20">
      <Logo size={28} textClass="text-2xl" className="mb-3" />
      <header className="flex items-end justify-between gap-4">
        <h1 className="font-hand text-5xl font-bold">{title}</h1>
        <span className="flex gap-4 text-sm">
          <Link
            href={`/how-to-play/${pathname.split("/").pop()}`}
            className="font-medium underline underline-offset-4 hover:text-ink"
          >
            How to play
          </Link>
          <Link href="/party" className="text-faint underline underline-offset-4 hover:text-ink">
            All party games
          </Link>
        </span>
      </header>
      {children}
      {drinking && (
        <p className="mt-16 text-xs text-faint">
          Over 18s only where drinking is involved. Swap drinks for water or forfeits anytime, and look after each
          other.
        </p>
      )}
    </main>
  );
}

export function PlayerSetup({
  intro,
  onStart,
  minPlayers = 0,
  maxPlayers = MAX_PLAYERS,
}: {
  intro: React.ReactNode;
  onStart: (players: string[]) => void;
  minPlayers?: number;
  maxPlayers?: number;
}) {
  const [names, setNames] = useState("");
  const players = names
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, maxPlayers);
  const enough = players.length >= minPlayers;
  return (
    <form
      className="pop mt-8 max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (enough) onStart(players);
      }}
    >
      <div className="text-faint">{intro}</div>
      <label htmlFor="names" className="mt-8 block text-sm font-medium">
        Players{" "}
        <span className="text-faint">
          {minPlayers > 0
            ? `(one per line, ${minPlayers}–${maxPlayers} players)`
            : "(optional, one per line — tracks whose turn it is)"}
        </span>
      </label>
      <textarea
        id="names"
        value={names}
        onChange={(e) => setNames(e.target.value.replace(/,/g, "\n"))}
        rows={4}
        placeholder={"Sam\nAlex\nJo"}
        className="mt-1 w-full resize-none rounded-md border-2 border-ink bg-paper px-3 py-2 font-hand text-2xl leading-8 outline-none placeholder:text-faint/50"
      />
      <button
        disabled={!enough}
        className="mt-6 rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
      >
        Shuffle &amp; start
      </button>
      {!enough && (
        <p className="mt-2 text-sm text-faint">
          Add at least {minPlayers} players — this game needs names to deal to.
        </p>
      )}
    </form>
  );
}

export function GameToolbar({ game, left }: { game: ReturnType<typeof useDeckGame>; left: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      <button
        onClick={async () => {
          await navigator.clipboard?.writeText(location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="rounded-md border-2 border-ink px-3 py-1.5 font-medium transition hover:bg-ink hover:text-paper"
      >
        {copied ? "Copied!" : "Copy game link"}
      </button>
      <button
        onClick={game.undo}
        disabled={!game.moves}
        className="text-faint underline underline-offset-4 hover:text-ink disabled:opacity-40"
      >
        Undo
      </button>
      <button onClick={game.reshuffle} className="text-faint underline underline-offset-4 hover:text-ink">
        New deck
      </button>
      <button onClick={game.reset} className="text-faint underline underline-offset-4 hover:text-ink">
        Change players
      </button>
      <span className="ml-auto font-mono text-xs text-faint">{left} cards left</span>
    </div>
  );
}
