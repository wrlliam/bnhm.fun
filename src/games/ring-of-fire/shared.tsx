"use client";

import { useState } from "react";
import { PlayingCard } from "@/components/playing-card";
import { Avatar } from "@/components/room/avatar";
import { act, BigButton } from "@/components/room/room-shell";
import type { RoomView } from "@/lib/rooms/client";
import type { RofGameView } from "@/lib/rooms/registry";
import { RANK_ORDER, RULES } from "@/lib/ring-of-fire";

export type RofProps = { room: RoomView; token: string | null; hostToken: string | null };

export const game = (room: RoomView) => room.game as RofGameView;
export const nameOf = (room: RoomView, id: string | null | undefined) =>
  room.players.find((p) => p.id === id)?.name ?? "Someone";
export const playerOf = (room: RoomView, id: string | null | undefined) => room.players.find((p) => p.id === id);

/** The drawn card with its full explanation. `big` is the TV layout. */
export function CurrentCard({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = game(room);
  const cur = g.current;
  if (!cur) return null;
  const rule = RULES[cur.card.rank];
  const drawer = playerOf(room, cur.by);
  const fourthKing = cur.card.rank === "K" && g.kings >= 4 && !cur.pending;
  return (
    <div key={g.drawnCount} className={`pop grid items-start gap-6 ${big ? "grid-cols-[auto_1fr] gap-10" : "sm:grid-cols-[auto_1fr]"}`}>
      <div className="justify-self-center">
        <PlayingCard card={cur.card} size="lg" />
      </div>
      <div>
        <p className={`flex items-center gap-2 text-faint ${big ? "text-2xl" : ""}`}>
          {drawer && <Avatar player={drawer} size={big ? 40 : 24} />}
          {nameOf(room, cur.by)} drew
        </p>
        <h2 className={`font-hand font-bold leading-none ${big ? "text-8xl" : "text-6xl"} ${fourthKing ? "text-miss" : ""}`}>
          {fourthKing ? "King's cup!" : rule.name}
        </h2>
        <p className={`mt-3 max-w-xl ${big ? "text-3xl" : "text-lg"}`}>{rule.text}</p>
        <ol className={`mt-4 max-w-xl list-decimal space-y-1 pl-5 ${big ? "text-xl" : "text-sm"}`}>
          {rule.how.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {rule.example && (
          <p className={`mt-3 max-w-xl text-faint ${big ? "text-lg" : "text-sm"}`}>
            <span className="font-medium text-ink">Example: </span>
            {rule.example}
          </p>
        )}
        {cur.outcome && (
          <p className={`mt-5 inline-block rounded-md bg-ink px-3 py-1.5 font-medium text-paper ${big ? "text-2xl" : ""}`}>
            {cur.outcome}
          </p>
        )}
        {cur.pending && g.choice && cur.by !== room.me && (
          <p className={`mt-5 text-faint ${big ? "text-2xl" : ""}`}>
            Waiting for {nameOf(room, cur.by)}: {g.choice.prompt.toLowerCase()}
          </p>
        )}
      </div>
    </div>
  );
}

/** Picker for the drawer (or host) to say who drinks / who's their mate / the new rule. */
export function Chooser({ room, token, hostToken }: RofProps) {
  const g = game(room);
  // Guys / Girls: start with everyone known to be in the group already ticked
  const [picked, setPicked] = useState<string[]>(g.suggested);
  const choice = g.choice;
  const cur = g.current;
  if (!choice || !cur) return null;

  const send = (targets: string[], t?: string) => act(room, token, hostToken, { type: "choose", targets, text: t });

  if (choice.kind === "rule") {
    return <JackChooser room={room} onRule={(t) => send([], t)} token={token} hostToken={hostToken} />;
  }

  const candidates = room.players.filter((p) => !(choice.kind === "mate" && p.id === cur.by));
  const unknown = room.players.filter((p) => !p.group);
  return (
    <div className="mt-6 rounded-xl border border-ink/15 bg-surface p-5">
      <p className="font-medium">{choice.prompt}</p>
      {choice.kind === "many" && unknown.length > 0 && (
        <p className="mt-1 text-sm text-faint">
          {g.suggested.length > 0 && "Players who said already are ticked. "}
          {unknown.map((p) => p.name).join(", ")} didn&rsquo;t say when joining — tick them if it applies.
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {candidates.map((p) => {
          const on = picked.includes(p.id);
          const alreadyMate = choice.kind === "mate" && g.mates.some(([a, b]) => a === cur.by && b === p.id);
          return (
            <button
              key={p.id}
              disabled={alreadyMate}
              title={alreadyMate ? "Already your mate" : undefined}
              onClick={() =>
                choice.kind === "many" ? setPicked((x) => (on ? x.filter((i) => i !== p.id) : [...x, p.id])) : send([p.id])
              }
              className={`flex items-center gap-2 rounded-lg border-2 p-2 text-left transition-colors ${
                alreadyMate ? "cursor-not-allowed border-ink/10 opacity-40" : on ? "border-hit bg-hit/10" : "border-ink/20 hover:border-ink"
              }`}
            >
              <Avatar player={p} size={36} />
              <span>
                <span className="block font-hand text-2xl font-bold leading-none">{p.id === room.me ? "Me" : p.name}</span>
                {alreadyMate && <span className="text-xs text-faint">already your mate</span>}
              </span>
            </button>
          );
        })}
      </div>
      {choice.kind === "many" && (
        <BigButton className="mt-4" onClick={() => send(picked)}>
          {picked.length ? `${picked.length} drink${picked.length === 1 ? "s" : ""}` : "Nobody — confirm"}
        </BigButton>
      )}
    </div>
  );
}

/** Host-only: switch card types on/off. Disabled cards are skipped when drawing. */
export function CardSettings({
  room,
  hostToken,
  compact = false,
}: {
  room: RoomView;
  hostToken: string | null;
  compact?: boolean;
}) {
  const g = game(room);
  const toggle = (rank: string) => {
    const next = g.disabled.includes(rank as never) ? g.disabled.filter((r) => r !== rank) : [...g.disabled, rank];
    act(room, null, hostToken, { type: "settings", disabled: next });
  };
  return (
    <div>
      <p className="text-sm font-medium">Cards in play</p>
      <p className="text-xs text-faint">Tap to turn a card off — it&rsquo;s skipped when drawing. You can change this mid-game.</p>
      <div className={`mt-2 grid gap-1.5 ${compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4"}`}>
        {RANK_ORDER.map((r) => {
          const off = g.disabled.includes(r);
          return (
            <button
              key={r}
              onClick={() => toggle(r)}
              aria-pressed={!off}
              className={`rounded-md border-2 px-2 py-1.5 text-left text-xs transition-colors ${
                off ? "border-faint/30 text-faint line-through" : "border-ink bg-surface hover:bg-ink/5"
              }`}
            >
              <span className="font-mono font-bold">{r}</span> {RULES[r].name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Mates, rules, question master, kings — the stuff that persists between cards. */
export function TableInfo({ room, big = false, hostToken }: { room: RoomView; big?: boolean; hostToken?: string | null }) {
  const g = game(room);
  const txt = big ? "text-xl" : "text-sm";
  return (
    <div className={`space-y-5 ${txt}`}>
      {g.kingsOn && (
        <p>
          <span className="text-faint">Kings </span>
          <span className={big ? "text-3xl" : "text-xl"}>
            {"♚".repeat(g.kings)}
            <span className="text-faint/40">{"♚".repeat(Math.max(0, 4 - g.kings))}</span>
          </span>
        </p>
      )}
      {g.questionMaster && (
        <p>
          <span className="text-faint">Question master </span>
          <strong>{nameOf(room, g.questionMaster)}</strong>
        </p>
      )}
      {g.mates.length > 0 && (
        <div>
          <p className="text-faint">Mates (left drinks → right drinks too)</p>
          <ul className="mt-1 space-y-1">
            {g.mates.map(([a, b]) => (
              <li key={a + b} className="flex items-center gap-2">
                <MiniPlayer room={room} id={a} big={big} /> → <MiniPlayer room={room} id={b} big={big} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {g.rules.length > 0 && (
        <div>
          <p className="text-faint">Rules in play</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {g.rules.map((r) => (
              <li key={r.id}>
                {r.text} <span className="text-faint">— {nameOf(room, r.by)}</span>
                {room.isHost && <RemoveRule room={room} hostToken={hostToken ?? null} id={r.id} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniPlayer({ room, id, big }: { room: RoomView; id: string; big: boolean }) {
  const p = playerOf(room, id);
  if (!p) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar player={p} size={big ? 32 : 22} />
      <span className="font-medium">{p.name}</span>
    </span>
  );
}

/** Sips per player so far this game, from the drink log. */
export function drinkTotals(room: RoomView) {
  const totals = new Map<string, number>();
  for (const d of room.drinks) totals.set(d.playerId, (totals.get(d.playerId) ?? 0) + Math.max(1, d.amount));
  return totals;
}

/** Host: pair players up as drinking partners at any time (same effect as an 8 / Mate). */
export function PairsEditor({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = game(room);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [both, setBoth] = useState(true);
  const select = "min-w-0 flex-1 rounded-md border-2 border-ink/25 transition-colors focus:border-ink bg-paper px-2 py-1.5";

  return (
    <div className="space-y-3 text-sm">
      <p className="text-faint">When the first person drinks, the second person&rsquo;s phone tells them to drink too.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={a} onChange={(e) => setA(e.target.value)} className={select} aria-label="First player">
          <option value="">Player…</option>
          {room.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span>{both ? "⇄" : "→"}</span>
        <select value={b} onChange={(e) => setB(e.target.value)} className={select} aria-label="Partner">
          <option value="">Partner…</option>
          {room.players
            .filter((p) => p.id !== a)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={both} onChange={(e) => setBoth(e.target.checked)} />
        Both ways (either one drinks → both drink)
      </label>
      <button
        disabled={!a || !b || a === b}
        onClick={async () => {
          if (await act(room, null, hostToken, { type: "addMate", a, b, both })) {
            setA("");
            setB("");
          }
        }}
        className="rounded-md bg-ink px-4 py-2 font-medium text-paper disabled:opacity-40"
      >
        Add partners
      </button>
      {g.mates.length > 0 && (
        <ul className="space-y-1">
          {g.mates.map(([x, y]) => (
            <li key={x + y} className="flex items-center gap-2">
              <span>
                {nameOf(room, x)} → {nameOf(room, y)}
              </span>
              <button
                onClick={() => act(room, null, hostToken, { type: "removeMate", a: x, b: y })}
                className="text-xs text-faint underline underline-offset-2 hover:text-miss"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Host-only "remove" link next to a rule. */
export function RemoveRule({ room, hostToken, id }: { room: RoomView; hostToken: string | null; id: number }) {
  return (
    <button
      onClick={() => confirm("Remove this rule for everyone?") && act(room, null, hostToken, { type: "removeRule", id })}
      className="ml-2 text-xs text-faint underline underline-offset-2 hover:text-miss"
    >
      remove
    </button>
  );
}

/** Jack: write a new rule, or (if there are rules) spend it calling a vote to scrap one instead. */
function JackChooser({
  room,
  onRule,
  token,
  hostToken,
}: {
  room: RoomView;
  onRule: (text: string) => void;
  token: string | null;
  hostToken: string | null;
}) {
  const g = game(room);
  const [mode, setMode] = useState<"new" | "vote">("new");
  const [text, setText] = useState("");
  const [ruleId, setRuleId] = useState<number | null>(null);
  const canVote = g.rules.length > 0;

  return (
    <div className="mt-6 rounded-xl border border-ink/15 bg-surface p-5">
      <p className="font-medium">Your Jack — pick one:</p>
      {canVote && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {(
            [
              ["new", "Make a new rule"],
              ["vote", "Vote to scrap a rule"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded-md border-2 py-2 font-medium ${mode === m ? "border-ink bg-ink text-paper" : "border-ink/30"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === "new" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRule(text);
          }}
        >
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={120}
            placeholder="e.g. No saying anyone's name"
            className="mt-4 w-full border-b-2 border-ink bg-transparent py-1 font-hand text-3xl outline-none"
          />
          <BigButton className="mt-4" disabled={!text.trim()}>
            Set the rule
          </BigButton>
          {canVote && <p className="mt-2 text-xs text-faint">Or switch to “Vote to scrap a rule” — you can&rsquo;t do both.</p>}
        </form>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-faint">
            Everyone votes on their phone. More yes than no and the rule is gone. You don&rsquo;t get to make a new rule
            this turn.
          </p>
          <div className="mt-3 space-y-2">
            {g.rules.map((r) => (
              <label
                key={r.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 ${ruleId === r.id ? "border-hit bg-hit/10" : "border-ink/20"}`}
              >
                <input type="radio" name="rule" checked={ruleId === r.id} onChange={() => setRuleId(r.id)} className="mt-1" />
                <span>
                  {r.text} <span className="text-faint">— {nameOf(room, r.by)}</span>
                </span>
              </label>
            ))}
          </div>
          <BigButton
            className="mt-4"
            disabled={ruleId === null}
            onClick={() => act(room, token, hostToken, { type: "choose", mode: "removeVote", ruleId })}
          >
            Start the vote
          </BigButton>
        </div>
      )}
    </div>
  );
}

/** Live "scrap this rule?" vote. Phones get Yes / No; the TV (big) shows the tally. */
export function RuleVote({ room, token, hostToken, big = false }: RofProps & { big?: boolean }) {
  const g = game(room);
  const v = g.vote;
  if (!v) return null;
  const votes = Object.entries(v.votes);
  const yes = votes.filter(([, y]) => y).length;
  const no = votes.length - yes;
  const mine = room.me ? v.votes[room.me] : undefined;

  return (
    <div className={`pop rounded-2xl border border-ink/15 bg-surface p-5 ${big ? "text-2xl" : ""}`}>
      <p className="text-faint">{nameOf(room, v.by)} used a Jack to call a vote</p>
      <h3 className={`font-hand font-bold leading-tight ${big ? "text-6xl" : "text-4xl"}`}>Scrap the rule “{v.text}”?</h3>
      {room.me && !big && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(
            [
              [true, "Yes, scrap it"],
              [false, "No, keep it"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={label}
              onClick={() => act(room, token, null, { type: "ruleVote", yes: val })}
              className={`rounded-xl border-2 py-4 text-lg font-bold transition-colors ${
                mine === val ? (val ? "border-hit bg-hit text-paper" : "border-miss bg-miss text-paper") : "border-ink/30 hover:border-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <p className="mt-4">
        <span className="font-bold text-hit">{yes} yes</span> · <span className="font-bold text-miss">{no} no</span> ·{" "}
        <span className="text-faint">
          {votes.length}/{room.players.filter((p) => p.online).length} voted
        </span>
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {room.players.map((p) => (
          <Avatar key={p.id} player={p} size={big ? 40 : 26} dim={!(p.id in v.votes)} />
        ))}
      </div>
      <p className={`mt-3 text-faint ${big ? "text-base" : "text-xs"}`}>
        Closes when everyone has voted. More yes than no scraps the rule; a tie keeps it.
      </p>
      {room.isHost && (
        <button
          onClick={() => act(room, null, hostToken, { type: "closeVote" })}
          className="mt-3 text-sm underline underline-offset-4"
        >
          Close the vote now
        </button>
      )}
    </div>
  );
}
