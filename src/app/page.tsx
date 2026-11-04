"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Emblem } from "@/components/emblem";
import { SiteNav } from "@/components/site-nav";
import { CATEGORIES, GAMES_CATALOG } from "@/lib/catalog";

const FAN = ["spotlight", "punchline", "ring-of-fire", "bluff", "odd-one-out"];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const c = code.trim().toUpperCase();
    if (c.length !== 4) return setError("Room codes are 4 letters");
    setBusy(true);
    const res = await fetch(`/api/rooms/${c}`).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      return setError(res?.status === 404 ? `No room with code ${c}` : "Couldn't reach the server");
    }
    router.push(`/r/${c}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />

      {/* hero: join on the left, a hand of game cards on the right */}
      <section className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-hand text-7xl font-bold leading-none">Game night</h1>
          <p className="mt-3 max-w-md text-lg">Party games everyone plays on their own phone, with the TV as the table.</p>

          <form onSubmit={join} className="mt-8 max-w-md">
            <label htmlFor="code" className="text-sm font-medium">
              Join a room
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                maxLength={4}
                placeholder="CODE"
                autoComplete="off"
                autoCapitalize="characters"
                className="w-0 flex-1 rounded-xl border-2 border-ink bg-paper px-3 py-3 text-center font-mono text-3xl tracking-[0.4em] outline-none placeholder:text-faint/50 focus:border-hit"
              />
              <button
                disabled={busy}
                className="rounded-xl bg-ink px-6 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
              >
                Join
              </button>
            </div>
            {error ? (
              <p className="pop mt-2 text-sm text-miss">{error}</p>
            ) : (
              <p className="mt-2 text-sm text-faint">Or scan the QR code on the host&rsquo;s TV</p>
            )}
          </form>
        </div>

        <div className="relative hidden h-56 w-80 md:block" aria-hidden>
          {FAN.map((kind, i) => {
            const g = GAMES_CATALOG.find((x) => x.kind === kind)!;
            const angle = (i - 2) * 13;
            return (
              <span
                key={kind}
                className="absolute bottom-0 left-1/2 origin-bottom"
                style={{ transform: `translateX(calc(-50% + ${(i - 2) * 30}px)) translateY(${Math.abs(i - 2) * 10}px) rotate(${angle}deg)` }}
              >
                <Emblem rank={g.emblem.rank} suit={g.emblem.suit} size="lg" className="shadow-lg" />
              </span>
            );
          })}
        </div>
      </section>

      {CATEGORIES.map((c) => (
        <section key={c.id} className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-hand text-4xl font-bold">{c.title}</h2>
            <p className="hidden text-sm text-faint sm:block">{c.hint}</p>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {GAMES_CATALOG.filter((g) => g.category === c.id).map((g) => (
              <li key={g.kind}>
                <Link
                  href={`/new/${g.kind}`}
                  className="group flex h-full items-center gap-4 rounded-2xl border border-ink/10 bg-surface p-4 transition-colors hover:border-ink/30"
                >
                  <Emblem rank={g.emblem.rank} suit={g.emblem.suit} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-hand text-3xl font-bold leading-none">{g.name}</span>
                    <span className="mt-1 block text-sm text-faint">{g.tagline}</span>
                    <span className="mt-1 block font-mono text-xs text-faint">
                      {g.players} players · {g.time}
                    </span>
                  </span>
                  <span className="text-faint transition-colors group-hover:text-ink" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-14 grid gap-3 sm:grid-cols-2">
        <Link href="/solo" className="rounded-2xl border border-ink/10 bg-surface p-5 transition-colors hover:border-ink/30">
          <span className="block font-hand text-3xl font-bold">Play on your own</span>
          <span className="mt-1 block text-sm text-faint">Six Tries word puzzles you can share, and Mini Grid crosswords</span>
        </Link>
        <Link href="/party" className="rounded-2xl border border-ink/10 bg-surface p-5 transition-colors hover:border-ink/30">
          <span className="block font-hand text-3xl font-bold">Just one phone?</span>
          <span className="mt-1 block text-sm text-faint">Pass-the-phone card games: Ride the Bus, Pyramid, Horse Race and more</span>
        </Link>
      </section>
    </main>
  );
}
