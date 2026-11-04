"use client";

import { useCallback, useEffect, useState } from "react";

type Counts = { room_created: number; player_joined: number; game_started: number; reaction: number };
type Stats = {
  storage: "redis" | "memory";
  totals: Counts;
  today: Counts;
  days: ({ day: string } & Counts)[];
  games: { kind: string; started: number }[];
  live: { rooms: number; playersOnline: number; byGame: Record<string, number> };
};

const LABELS: Record<keyof Counts, string> = {
  room_created: "Rooms created",
  player_joined: "Players joined",
  game_started: "Games started",
  reaction: "Reactions",
};

async function fetchStats(key: string): Promise<{ ok: true; data: Stats } | { ok: false; error: string }> {
  const res = await fetch("/api/stats", { headers: { "x-stats-key": key }, cache: "no-store" }).catch(() => null);
  const data = await res?.json().catch(() => null);
  if (!res?.ok) return { ok: false, error: data?.error ?? "Couldn't load stats" };
  return { ok: true, data };
}

const pretty = (kind: string) => kind.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Owner-only usage dashboard. The key is kept in this tab's session only. */
export default function StatsPage() {
  const [key, setKey] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  const apply = useCallback((r: Awaited<ReturnType<typeof fetchStats>>, k: string) => {
    if (!r.ok) {
      setStats(null);
      setError(r.error);
      return;
    }
    sessionStorage.setItem("stats-key", k);
    setError("");
    setStats(r.data);
  }, []);

  const load = (k: string) => fetchStats(k).then((r) => apply(r, k));

  // auto-load with the key from this tab's session, and refresh every 15 s
  useEffect(() => {
    const saved = sessionStorage.getItem("stats-key");
    if (!saved) return;
    let alive = true;
    const tick = () => fetchStats(saved).then((r) => alive && apply(r, saved));
    tick();
    const t = setInterval(tick, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [apply]);

  if (!stats) {
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <form
          className="w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void load(key);
          }}
        >
          <h1 className="font-hand text-5xl font-bold">Stats</h1>
          <p className="mt-1 text-sm text-faint">Enter the STATS_KEY from your server&rsquo;s environment.</p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            autoFocus
            className="mt-6 w-full rounded-md border-2 border-ink/25 transition-colors focus:border-ink bg-paper px-3 py-3 font-mono outline-none"
            aria-label="Stats key"
          />
          <button className="mt-4 w-full rounded-md bg-ink py-3 font-medium text-paper">Show stats</button>
          {error && <p className="mt-3 text-sm text-miss">{error}</p>}
        </form>
      </main>
    );
  }

  const max = Math.max(1, ...stats.days.map((d) => d.room_created));
  const maxGame = Math.max(1, ...stats.games.map((g) => g.started));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:pl-20">
      <div className="flex items-baseline justify-between">
        <h1 className="font-hand text-5xl font-bold">Stats</h1>
        <span className="text-xs text-faint">
          stored in {stats.storage} · refreshes every 15 s · no personal data collected
        </span>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Live rooms" value={stats.live.rooms} />
        <Tile label="Players online" value={stats.live.playersOnline} />
        <Tile label="Rooms today" value={stats.today.room_created} />
        <Tile label="Games today" value={stats.today.game_started} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">All time</h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(LABELS) as (keyof Counts)[]).map((k) => (
            <Tile key={k} label={LABELS[k]} value={stats.totals[k]} small />
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Rooms created, last 14 days</h2>
        <div className="mt-3 flex h-40 items-end gap-1.5 rounded-xl bg-surface p-3" role="img" aria-label="Rooms created per day">
          {stats.days.map((d) => (
            <div key={d.day} className="group flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${d.room_created} rooms, ${d.game_started} games`}>
              <span className="text-[10px] text-faint opacity-0 group-hover:opacity-100">{d.room_created}</span>
              <div className="w-full rounded-t bg-hit" style={{ height: `${(d.room_created / max) * 100}%`, minHeight: d.room_created ? 4 : 1 }} />
              <span className="text-[10px] text-faint">{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Most played (games started)</h2>
        <ul className="mt-3 space-y-2">
          {stats.games.length === 0 && <li className="text-sm text-faint">No games yet.</li>}
          {stats.games.map((g) => (
            <li key={g.kind} className="flex items-center gap-3">
              <span className="w-40 text-sm">{pretty(g.kind)}</span>
              <div className="h-3 flex-1 rounded-full bg-ink/10">
                <div className="h-3 rounded-full bg-ink" style={{ width: `${(g.started / maxGame) * 100}%` }} />
              </div>
              <span className="w-10 text-right font-mono text-sm">{g.started}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Tile({ label, value, small = false }: { label: string; value: number; small?: boolean }) {
  return (
    <div className="rounded-xl border-2 border-ink/10 bg-surface p-4">
      <p className="text-xs text-faint">{label}</p>
      <p className={`font-mono font-bold ${small ? "text-2xl" : "text-4xl"}`}>{value.toLocaleString()}</p>
    </div>
  );
}
