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
      {choice.kind === "mate" && g.pairLimit && g.mates.length > 0 && (
        <p className="mt-1 text-sm text-faint">Small table: one partnership at a time, so this replaces the current one</p>
      )}
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

/** Host: pair players up as drinking partners (same effect as an 8 / Mate). Tap a face, tap their partner. */
export function PairsEditor({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = game(room);
  const [first, setFirst] = useState<string | null>(null);
  const [second, setSecond] = useState<string | null>(null);
  const [both, setBoth] = useState(true);
  const [busy, setBusy] = useState(false);
  const has = (a: string, b: string) => g.mates.some(([x, y]) => x === a && y === b);
  const name = (id: string | null) => (!id ? "" : id === room.me ? "you" : nameOf(room, id));
  const drinks = (id: string | null) => (id === room.me ? "drink" : "drinks");
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  // two-way pairs show once, as A ⇄ B
  const chips: { a: string; b: string; twoWay: boolean }[] = [];
  for (const [a, b] of g.mates) {
    if (chips.some((c) => (c.a === b && c.b === a) || (c.a === a && c.b === b))) continue;
    chips.push({ a, b, twoWay: has(b, a) });
  }

  const already = !!first && !!second && has(first, second) && (!both || has(second, first));
  const sentence = cap(
    already
      ? `${name(first)} and ${name(second)} are already partners`
      : !first
        ? "Tap the first player"
        : !second
          ? `Now tap who drinks with ${name(first)}`
          : both
            ? `${name(first)} and ${name(second)} always drink together`
            : `When ${name(first)} ${drinks(first)}, ${name(second)} ${drinks(second)} too, not the other way round`,
  );

  const pick = (id: string) => {
    if (!first || (first && second)) {
      setFirst(id);
      setSecond(null);
    } else if (id === first) setFirst(null);
    else setSecond(id);
  };

  return (
    <div className="space-y-4">
      {g.pairLimit && <p className="text-xs text-faint">Small table: one partnership at a time. Pairing someone new replaces it</p>}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink/5 p-1 text-sm" role="radiogroup" aria-label="Direction">
        {(
          [
            [true, "Both ways", "⇄"],
            [false, "One way", "→"],
          ] as const
        ).map(([val, label, glyph]) => (
          <button
            key={label}
            role="radio"
            aria-checked={both === val}
            onClick={() => setBoth(val)}
            className={`rounded-lg py-2 font-medium transition-colors ${both === val ? "bg-surface shadow-sm" : "text-faint hover:text-ink"}`}
          >
            <span className="mr-1.5 font-mono">{glyph}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {room.players.map((p) => {
          const role = p.id === first ? 1 : p.id === second ? 2 : 0;
          return (
            <button
              key={p.id}
              onClick={() => pick(p.id)}
              aria-pressed={role > 0}
              className="flex w-16 flex-col items-center gap-1 text-center"
            >
              <span className="relative">
                <Avatar player={p} size={52} ring={role ? "ring-hit" : undefined} dim={!!first && !!second && !role} />
                {role > 0 && (
                  <span className="cheer absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-hit font-mono text-[11px] font-bold text-paper">
                    {role}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-xs">{p.id === room.me ? "You" : p.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className={`flex-1 text-sm ${first && second ? "font-medium" : "text-faint"}`}>{sentence}</p>
        {first && second && !already && (
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              if (await act(room, null, hostToken, { type: "addMate", a: first, b: second, both })) {
                setFirst(null);
                setSecond(null);
              }
              setBusy(false);
            }}
            className="pop rounded-lg bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            Pair them
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Current partners">
          {chips.map(({ a, b, twoWay }) => {
            const pa = playerOf(room, a);
            const pb = playerOf(room, b);
            return (
              <li key={a + b} className="flex items-center gap-1.5 rounded-full border border-ink/15 bg-surface py-1 pl-1 pr-1.5 text-sm">
                {pa && <Avatar player={pa} size={24} />}
                <span className="font-mono text-faint" aria-label={twoWay ? "both ways" : "one way"}>
                  {twoWay ? "⇄" : "→"}
                </span>
                {pb && <Avatar player={pb} size={24} />}
                <span className="ml-1">
                  {cap(name(a))} &amp; {name(b)}
                </span>
                <button
                  onClick={async () => {
                    await act(room, null, hostToken, { type: "removeMate", a, b });
                    if (twoWay) await act(room, null, hostToken, { type: "removeMate", a: b, b: a });
                  }}
                  aria-label={`Unpair ${name(a)} and ${name(b)}`}
                  className="ml-1 flex size-6 items-center justify-center rounded-full text-faint transition-colors hover:bg-miss/15 hover:text-miss"
                >
                  ×
                </button>
              </li>
            );
          })}
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

function SwitchRow({ label, hint, on, onChange }: { label: string; hint: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 rounded-xl text-left">
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-faint">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-hit" : "bg-ink/20"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition-[left] ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/**
 * Host house rules: endless decks and how drinking partners behave.
 * Turning endless off is how you "cancel" it: the game ends with the current deck.
 */
export function HouseRules({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = game(room);
  const h = g.house;
  const set = (body: Record<string, unknown>) => act(room, null, hostToken, { type: "house", ...body });
  return (
    <div className="space-y-3">
      <SwitchRow
        label={`Endless mode${g.endless && g.status !== "lobby" ? ` · deck ${g.deckNo}` : ""}`}
        hint={g.endless ? "A new deck is shuffled in whenever one runs out. Turn off to end with this deck" : "Shuffle in a new deck whenever one runs out"}
        on={g.endless}
        onChange={(on) => act(room, null, hostToken, { type: "endless", on })}
      />
      <SwitchRow
        label="Fresh partners halfway"
        hint="Clear every drinking partner once half the deck is drawn"
        on={h.clearHalfway}
        onChange={(on) => set({ clearHalfway: on })}
      />
      {g.endless && (
        <SwitchRow
          label="Fresh partners each deck"
          hint="Clear every drinking partner when a new deck is shuffled in"
          on={h.clearEachDeck}
          onChange={(on) => set({ clearEachDeck: on })}
        />
      )}
      <div>
        <p className="text-sm font-medium">Small table partners</p>
        <p className="text-xs text-faint">
          With few players, allow one partnership at a time. A new pair replaces it
          {g.pairLimit ? ". On now" : ""}
        </p>
        <div className="mt-2 flex gap-1 rounded-xl bg-ink/5 p-1">
          {[
            [0, "No limit"],
            [3, "3 or fewer"],
            [4, "4 or fewer"],
          ].map(([n, label]) => (
            <button
              key={n}
              onClick={() => set({ onePairUpTo: n })}
              className={`flex-1 rounded-lg py-1.5 text-sm font-medium ${h.onePairUpTo === n ? "bg-surface shadow-sm" : "text-faint"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** When the deck runs out: keep going with a new deck, go endless, or (via What's next) end it. */
export function DeckFinished({ room, hostToken, big = false }: { room: RoomView; hostToken: string | null; big?: boolean }) {
  const g = game(room);
  return (
    <div className={`pop rounded-2xl border border-ink/15 bg-surface p-5 ${big ? "p-8" : ""}`}>
      <p className={`font-hand font-bold leading-none ${big ? "text-7xl" : "text-5xl"}`}>That&rsquo;s the whole deck</p>
      <p className={`mt-2 text-faint ${big ? "text-2xl" : ""}`}>
        {g.deckNo > 1 ? `${g.deckNo} decks played. ` : ""}Mates, rules and the question master carry on if you keep going
      </p>
      {room.isHost ? (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => act(room, null, hostToken, { type: "continue" })}
            className={`rounded-xl bg-ink font-medium text-paper transition-colors hover:bg-ink/90 ${big ? "px-8 py-4 text-xl" : "px-5 py-3"}`}
          >
            Keep going with a new deck
          </button>
          <button
            onClick={() => act(room, null, hostToken, { type: "endless", on: true })}
            className={`rounded-xl border-2 border-ink font-medium transition-colors hover:bg-ink hover:text-paper ${big ? "px-8 py-4 text-xl" : "px-5 py-3"}`}
          >
            Go endless
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm">Waiting for the host to keep going or pick another game</p>
      )}
    </div>
  );
}
