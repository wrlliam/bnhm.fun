"use client";

import { useEffect, useState } from "react";
import type { RoomView } from "@/lib/rooms/client";
import { useSettings } from "@/lib/settings";
import { Avatar } from "./avatar";

/** Number that counts up to `to` (instant when animations are off). */
export function CountUp({ to, suffix = "", ms = 900 }: { to: number; suffix?: string; ms?: number }) {
  const { motion } = useSettings();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!motion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, motion]);
  return (
    <span className="tabular-nums">
      {motion ? n : to}
      {suffix}
    </span>
  );
}

/** One result row: label, a growing bar, the percentage, and (optionally) who chose it. */
export function RevealBar({
  room,
  label,
  pct,
  count,
  voters,
  lead,
  hidden = false,
  big = false,
  delay = 0,
}: {
  room: RoomView;
  label: React.ReactNode;
  pct: number;
  count: number;
  voters: string[];
  lead: boolean;
  hidden?: boolean;
  big?: boolean;
  delay?: number;
}) {
  return (
    <div className={`pop ${big ? "space-y-3" : "space-y-2"}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-end justify-between gap-3">
        <div className={`min-w-0 font-medium ${big ? "text-3xl" : "text-lg"}`}>{label}</div>
        <div className={`font-mono font-bold ${lead ? "text-hit" : ""} ${big ? "text-5xl" : "text-2xl"}`}>
          <CountUp to={pct} suffix="%" />
        </div>
      </div>
      <div className={`overflow-hidden rounded-full bg-ink/10 ${big ? "h-6" : "h-3.5"}`}>
        <div
          className={`bar-grow h-full rounded-full ${lead ? "bg-hit" : "bg-ink/40"}`}
          style={{ width: `${Math.max(pct, 2)}%`, animationDelay: `${delay + 150}ms` }}
        />
      </div>
      <div className={`flex flex-wrap items-center gap-1.5 ${big ? "min-h-12" : "min-h-8"}`}>
        {hidden ? (
          <span className={`text-faint ${big ? "text-lg" : "text-sm"}`}>
            {count} {count === 1 ? "vote" : "votes"} · anonymous
          </span>
        ) : voters.length ? (
          voters.map((id, i) => {
            const p = room.players.find((x) => x.id === id);
            return p ? (
              <span key={id} className="cheer inline-flex items-center gap-1" style={{ animationDelay: `${delay + 500 + i * 90}ms` }}>
                <Avatar player={p} size={big ? 44 : 28} />
                {big && <span className="text-lg">{p.name}</span>}
              </span>
            ) : null;
          })
        ) : (
          <span className="text-sm text-faint">Nobody</span>
        )}
      </div>
    </div>
  );
}

/** Leaderboard with medals for the top three and the points just won. */
export function Podium({
  room,
  scores,
  gained = {},
  big = false,
}: {
  room: RoomView;
  scores: Record<string, number>;
  gained?: Record<string, number>;
  big?: boolean;
}) {
  const rows = room.players.map((p) => ({ p, score: scores[p.id] ?? 0, plus: gained[p.id] ?? 0 })).sort((a, b) => b.score - a.score);
  const medal = ["bg-[#e0a800]", "bg-[#a7adb7]", "bg-[#c07a3f]"];
  return (
    <ol className={`space-y-2 ${big ? "text-2xl" : ""}`}>
      {rows.map(({ p, score, plus }, i) => (
        <li key={p.id} className="pop flex items-center gap-3" style={{ animationDelay: `${i * 70}ms` }}>
          <span
            className={`flex shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${big ? "size-10" : "size-7"} ${
              i < 3 && score > 0 ? `${medal[i]} text-white` : "bg-ink/10 text-faint"
            }`}
          >
            {i + 1}
          </span>
          <Avatar player={p} size={big ? 52 : 34} />
          <span className="min-w-0 flex-1 truncate font-medium">{p.id === room.me ? `${p.name} (you)` : p.name}</span>
          {plus > 0 && <span className="cheer font-mono text-hit">+{plus}</span>}
          <span className={`w-20 text-right font-mono font-bold ${big ? "w-28" : ""}`}>
            <CountUp to={score} />
          </span>
        </li>
      ))}
    </ol>
  );
}
