"use client";

import { useEffect, useRef, useState } from "react";
import { AdminAccess } from "@/components/room/admin-access";
import { Avatar } from "@/components/room/avatar";
import { act, BigButton } from "@/components/room/room-shell";
import { Stickman } from "@/components/stickman";
import type { RoomView } from "@/lib/rooms/client";
import type { HangmanGameView } from "@/lib/rooms/registry";

const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
type Props = { room: RoomView; token: string | null; hostToken: string | null };
export const hm = (room: RoomView) => room.game as HangmanGameView;

export function Word({ room, big = false }: { room: RoomView; big?: boolean }) {
  const g = hm(room);
  const chars = g.word ? [...g.word] : g.masked;
  const words: number[][] = [[]];
  chars.forEach((c, i) => (c === " " ? words.push([]) : words[words.length - 1].push(i)));
  const tile = big ? "h-24 w-16 text-8xl" : "h-14 w-10 text-5xl";
  return (
    <div className="mt-2 flex flex-wrap gap-x-8 gap-y-4">
      {words.map((idxs, w) => (
        <div key={w} className="flex gap-2">
          {idxs.map((i) => {
            const c = chars[i];
            const revealed = g.masked[i] !== null && g.guessed.includes(c ?? "");
            const missed = g.status === "lost" && !g.guessed.includes(c ?? "");
            return (
              <span
                key={i}
                className={`flex items-end justify-center border-b-[3px] border-ink pb-1 font-hand font-bold ${tile} ${
                  missed ? "text-miss" : g.word && !revealed && g.status === "playing" ? "text-faint/50" : ""
                }`}
              >
                {c && <span className={revealed ? "pop" : ""}>{c}</span>}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function GuessToast({ room }: { room: RoomView }) {
  const ev = hm(room).lastEvent;
  const last = useRef(ev?.id ?? 0);
  const [show, setShow] = useState<typeof ev>(null);
  useEffect(() => {
    if (ev && ev.id !== last.current) {
      last.current = ev.id;
      setShow(ev);
      const t = setTimeout(() => setShow(null), 2200);
      return () => clearTimeout(t);
    }
  }, [ev]);
  if (!show) return null;
  return (
    <div
      role="status"
      className={`pop fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-md px-4 py-2 font-medium text-paper shadow-lg ${
        show.hit ? "bg-hit" : "bg-miss"
      }`}
    >
      {show.playerName} guessed <span className="font-mono">{show.letter}</span> — {show.hit ? "it's in!" : "not in the word"}
    </div>
  );
}

export function HangmanPlayer({ room, token, hostToken }: Props) {
  const g = hm(room);
  const isSetter = room.me === g.setterId;
  const canGuess = g.status === "playing" && !isSetter;
  const finished = g.status === "won" || g.status === "lost";
  const guess = (l: string) => act(room, token, hostToken, { type: "guess", letter: l });

  useEffect(() => {
    if (!canGuess) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k) && !g.guessed.includes(k)) guess(k);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const start = (label: string) => (
    <div className="mt-6">
      <BigButton disabled={room.players.length < 2} onClick={() => act(room, token, hostToken, { type: "start" })}>
        {label}
      </BigButton>
      {room.players.length < 2 && <p className="mt-2 text-sm text-faint">Need at least 2 players.</p>}
    </div>
  );

  return (
    <div>
      <GuessToast room={room} />
      {g.status === "lobby" && (
        <div className="pop">
          <h2 className="font-hand text-4xl font-bold">Waiting in the lobby</h2>
          <p className="mt-2 text-faint">Each round a different player picks the word. Everyone else guesses.</p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {room.players.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <Avatar player={p} size={32} dim={!p.online} />
                <span className="font-hand text-2xl">{p.name}</span>
                <span className="font-mono text-sm text-faint">{g.scores[p.id] ?? 0}</span>
              </li>
            ))}
          </ul>
          {start("Start first round")}
          <div className="mt-6">
            <AdminAccess room={room} hostToken={hostToken} />
          </div>
        </div>
      )}

      {g.status === "choosing" &&
        (isSetter ? (
          <WordPicker onSubmit={(word) => act(room, token, hostToken, { type: "setWord", word })} />
        ) : (
          <div className="pop">
            <h2 className="font-hand text-4xl font-bold">{g.setterName} is picking a word…</h2>
            <p className="mt-2 text-faint">Get ready to guess.</p>
          </div>
        ))}

      {(g.status === "playing" || finished) && (
        <div className="grid items-start gap-8 lg:grid-cols-[240px_1fr]">
          <div key={g.wrong.length} className={g.wrong.length ? "shake" : ""}>
            <Stickman wrong={g.wrong.length} lost={g.status === "lost"} />
            <p className="mt-2 text-sm text-faint">{g.maxWrong - g.wrong.length} wrong guesses left</p>
          </div>
          <div>
            <p className="text-sm text-faint">{isSetter ? "Your word — watch them squirm" : `${g.setterName}'s word`}</p>
            <Word room={room} />
            {g.wrong.length > 0 && (
              <p className="mt-6 text-sm">
                <span className="text-faint">Not in the word: </span>
                <span className="font-mono text-lg tracking-widest text-miss line-through decoration-2">{g.wrong.join(" ")}</span>
              </p>
            )}
            {finished ? (
              <div className="pop mt-8">
                <h2 className="font-hand text-5xl font-bold">
                  {g.status === "won" ? <span className="text-hit">Solved it</span> : <span className="text-miss">Hanged.</span>}
                </h2>
                <p className="mt-1 text-faint">
                  The word was <span className="font-mono text-ink">{g.word}</span>
                </p>
                {start("Next round")}
              </div>
            ) : (
              <div className="mt-8 space-y-2">
                {ROWS.map((row) => (
                  <div key={row} className="flex justify-center gap-1.5 sm:justify-start">
                    {[...row].map((l) => {
                      const used = g.guessed.includes(l);
                      const miss = g.wrong.includes(l);
                      return (
                        <button
                          key={l}
                          onClick={() => guess(l)}
                          disabled={!canGuess || used}
                          className={`h-11 w-8 rounded-md border-2 font-mono font-bold transition-colors sm:w-10 ${
                            used
                              ? miss
                                ? "border-miss/30 text-miss/50 line-through"
                                : "border-hit/40 bg-hit/10 text-hit"
                              : "border-ink hover:bg-ink hover:text-paper disabled:border-faint/40 disabled:text-faint/50 disabled:hover:bg-transparent"
                          }`}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                ))}
                {isSetter && <p className="pt-2 text-sm text-faint">You picked this one, so you sit out the guessing.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WordPicker({ onSubmit }: { onSubmit: (word: string) => Promise<boolean> }) {
  const [word, setWord] = useState("");
  const [show, setShow] = useState(false);
  return (
    <form
      className="pop max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(word);
      }}
    >
      <h2 className="font-hand text-4xl font-bold">Your turn to pick a word</h2>
      <p className="mt-2 text-faint">Letters and spaces only. Keep it hidden from everyone else.</p>
      <div className="mt-6 flex items-center gap-2 border-b-2 border-ink">
        <input
          autoFocus
          type={show ? "text" : "password"}
          value={word}
          onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z ]/g, ""))}
          maxLength={30}
          autoComplete="off"
          className="w-0 flex-1 bg-transparent py-1 font-hand text-4xl uppercase tracking-wider outline-none"
          aria-label="Secret word"
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="text-sm text-faint hover:text-ink">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      <BigButton className="mt-6" disabled={word.replace(/ /g, "").length < 2}>
        Lock it in
      </BigButton>
    </form>
  );
}
