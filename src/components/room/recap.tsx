"use client";

import type { RoomView } from "@/lib/rooms/client";
import { Avatar } from "./avatar";

type Row = { id: string; name: string; sips: number; alerts: number };

/** End-of-game recap: awards + sips table, built from whole-game server tallies. */
export function Recap({ room, big = false }: { room: RoomView; big?: boolean }) {
  const rows: Row[] = room.players
    .map((p) => ({ id: p.id, name: p.name, sips: room.stats[p.id]?.sips ?? 0, alerts: room.stats[p.id]?.alerts ?? 0 }))
    .sort((a, b) => b.sips - a.sips);
  if (!rows.length) return null;
  const top = rows[0];
  const least = rows[rows.length - 1];
  const picked = [...rows].sort((a, b) => b.alerts - a.alerts)[0];
  const total = rows.reduce((n, r) => n + r.sips, 0);
  const player = (id: string) => room.players.find((p) => p.id === id)!;

  const awards = [
    top.sips > 0 && { title: "Thirstiest", who: top, note: `${top.sips} sips` },
    rows.length > 1 && least.id !== top.id && { title: "Stayed dry", who: least, note: `${least.sips} sips` },
    picked.alerts > 0 && { title: "Most picked on", who: picked, note: `${picked.alerts} times` },
  ].filter(Boolean) as { title: string; who: Row; note: string }[];

  const summary = `${room.title} on bnhm.fun: ${total} sips in total.\n${rows.map((r, i) => `${i + 1}. ${r.name} (${r.sips})`).join("\n")}`;

  return (
    <div className={big ? "text-2xl" : ""}>
      <div className={`grid gap-3 ${big ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        {awards.map((a) => (
          <div key={a.title} className="pop flex items-center gap-3 rounded-2xl border border-ink/15 bg-surface p-3">
            <Avatar player={player(a.who.id)} size={big ? 64 : 44} />
            <div>
              <p className={`text-faint ${big ? "text-base" : "text-xs"}`}>{a.title}</p>
              <p className="font-hand text-3xl font-bold leading-none">{a.who.name}</p>
              <p className={big ? "text-lg" : "text-sm"}>{a.note}</p>
            </div>
          </div>
        ))}
      </div>
      <ol className="mt-4 space-y-1.5">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3">
            <span className="w-6 font-mono text-faint">{i + 1}</span>
            <Avatar player={player(r.id)} size={big ? 40 : 28} />
            <span className="flex-1 font-medium">{r.name}</span>
            <span className="font-mono">{r.sips}</span>
          </li>
        ))}
      </ol>
      <p className={`mt-3 text-faint ${big ? "text-base" : "text-xs"}`}>{total} sips in total · a whole King&rsquo;s cup counts as 5</p>
      {!big && (
        <button
          onClick={async () => {
            if (navigator.share) await navigator.share({ text: summary }).catch(() => {});
            else await navigator.clipboard?.writeText(summary);
          }}
          className="mt-3 text-sm underline underline-offset-4"
        >
          Share the results
        </button>
      )}
    </div>
  );
}
