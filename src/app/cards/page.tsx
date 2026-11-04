"use client";

import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PlayingCard } from "@/components/playing-card";
import {
  type Card,
  type Deal,
  deal,
  dealToQuery,
  MAX_PLAYERS,
  maxPerHand,
  newSeed,
  parseDeal,
} from "@/lib/cards";

export default function CardsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8 sm:pl-20">
      <SiteNav />
      <header className="flex items-end justify-between gap-4">
        <h1 className="font-hand text-5xl font-bold">Card dealer</h1>
        <span className="flex gap-4 text-sm">
          <Link href="/how-to-play/card-dealer" className="font-medium underline underline-offset-4">
            How to play
          </Link>
          <Link href="/party" className="text-faint underline underline-offset-4 hover:text-ink">
            All party games
          </Link>
        </span>
      </header>
      <Suspense fallback={<p className="mt-8 font-hand text-3xl text-faint">Shuffling…</p>}>
        <Dealer />
      </Suspense>
    </main>
  );
}

function Dealer() {
  const params = useSearchParams();
  const current = parseDeal(new URLSearchParams(params.toString()));

  if (!current) return <Setup />;
  if (current.me !== null) return <OwnHand d={current} me={current.me} />;
  return <Table d={current} />;
}

function Setup() {
  const router = useRouter();
  const [names, setNames] = useState("");
  const [perHand, setPerHand] = useState(5);
  const players = names
    .split(/[\n,]/)
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);
  const max = maxPerHand(players.length);
  const n = Math.min(perHand, max);

  return (
    <form
      className="pop mt-8 max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        if (players.length === 0) return;
        router.push(`/cards?${dealToQuery({ players, perHand: n, seed: newSeed() })}`);
      }}
    >
      <p className="text-faint">
        Shuffle a standard 52-card deck and deal a hand to each player. You get a table link and a private link for
        each player.
      </p>
      <label htmlFor="names" className="mt-8 block text-sm font-medium">
        Players <span className="text-faint">(one per line, max {MAX_PLAYERS})</span>
      </label>
      <textarea
        id="names"
        value={names}
        onChange={(e) => setNames(e.target.value.replace(/,/g, "\n"))}
        rows={4}
        placeholder={"Sam\nAlex\nJo"}
        className="mt-1 w-full resize-none rounded-md border-2 border-ink bg-paper px-3 py-2 font-hand text-2xl leading-8 outline-none placeholder:text-faint/50"
      />
      <label htmlFor="per" className="mt-6 block text-sm font-medium">
        Cards per hand: <span className="font-mono">{n}</span>
      </label>
      <input
        id="per"
        type="range"
        min={1}
        max={Math.min(max, 13)}
        value={n}
        onChange={(e) => setPerHand(Number(e.target.value))}
        className="mt-2 w-full accent-ink"
      />
      <button
        disabled={players.length === 0}
        className="mt-8 rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40"
      >
        Deal {players.length > 0 ? `${players.length} ${players.length === 1 ? "hand" : "hands"}` : ""}
      </button>
    </form>
  );
}

function Table({ d }: { d: Deal }) {
  const router = useRouter();
  const hands = deal(d);
  const used = d.players.length * d.perHand;

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <CopyButton query={dealToQuery(d)} label="Copy table link" primary />
        <button
          onClick={() => router.push(`/cards?${dealToQuery({ ...d, seed: newSeed() })}`)}
          className="rounded-md border-2 border-ink px-4 py-2 text-sm font-medium transition hover:bg-ink hover:text-paper"
        >
          Shuffle &amp; re-deal
        </button>
        <Link href="/cards" className="text-sm text-faint underline underline-offset-4 hover:text-ink">
          New players
        </Link>
        <span className="ml-auto text-xs text-faint">
          {52 - used} cards left in deck · deal #{d.seed}
        </span>
      </div>

      <ul className="mt-8 space-y-8">
        {d.players.map((name, i) => (
          <li key={i} className="pop" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-baseline gap-4">
              <h2 className="font-hand text-3xl font-bold">{name}</h2>
              <CopyButton query={dealToQuery(d, i)} label="Copy private link" />
            </div>
            <Hand cards={hands[i]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function OwnHand({ d, me }: { d: Deal; me: number }) {
  const [shown, setShown] = useState(false);
  const hand = deal(d)[me];
  return (
    <div className="pop mt-8">
      <p className="text-faint">Your hand, {d.players[me]}</p>
      <Hand cards={hand} hidden={!shown} />
      <button
        onClick={() => setShown((s) => !s)}
        className="mt-6 rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90"
      >
        {shown ? "Hide cards" : "Reveal my cards"}
      </button>
      <p className="mt-3 text-xs text-faint">Deal #{d.seed} · only your hand is shown on this link.</p>
    </div>
  );
}

function Hand({ cards, hidden = false }: { cards: Card[]; hidden?: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {cards.map((c, i) => (
        <PlayingCard key={i} card={c} hidden={hidden} />
      ))}
    </div>
  );
}

function CopyButton({ query, label, primary }: { query: string; label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard?.writeText(`${location.origin}/cards?${query}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={
        primary
          ? "rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition hover:bg-ink/90"
          : "text-sm text-faint underline underline-offset-4 hover:text-ink"
      }
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
