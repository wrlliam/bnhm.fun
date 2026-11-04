"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { useProfileName } from "@/lib/rooms/client";

const TRIES = 6;
type Info = { id: string; length: number; by: string; results: { name: string; solved: boolean; tries: number; rows: string[] }[] };
type Saved = { guesses: string[]; patterns: string[]; word: string | null; name: string };

const TILE: Record<string, string> = {
  g: "bg-[#4a9d5b] border-[#4a9d5b] text-white",
  y: "bg-[#d4a72c] border-[#d4a72c] text-white",
  x: "bg-[#8d939b] border-[#8d939b] text-white",
};
const SQUARE: Record<string, string> = { g: "🟩", y: "🟨", x: "⬜" };
const ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export function SixTries({ id }: { id: string }) {
  const profileName = useProfileName();
  const [info, setInfo] = useState<Info | null>(null);
  const [missing, setMissing] = useState(false);
  const [saved, setSaved] = useState<Saved>({ guesses: [], patterns: [], word: null, name: "" });
  const [current, setCurrent] = useState("");
  const [msg, setMsg] = useState("");
  const [shake, setShake] = useState(0);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const name = nameDraft ?? (saved.name || profileName);
  const key = `sixtries:${id}`;

  const load = useCallback(async () => {
    const res = await fetch(`/api/puzzles/${id}`, { cache: "no-store" });
    if (res.status === 404) return setMissing(true);
    if (res.ok) setInfo(await res.json());
  }, [id]);

  // puzzle info + any game in progress on this device
  useEffect(() => {
    let alive = true;
    fetch(`/api/puzzles/${id}`, { cache: "no-store" }).then(async (res) => {
      if (!alive) return;
      if (res.status === 404) return setMissing(true);
      if (res.ok) setInfo(await res.json());
    });
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        queueMicrotask(() => alive && setSaved(s));
      }
    } catch {}
    return () => {
      alive = false;
    };
  }, [id, key]);

  const persist = (s: Saved) => {
    setSaved(s);
    localStorage.setItem(key, JSON.stringify(s));
  };

  const len = info?.length ?? 5;
  const solved = saved.patterns.some((p) => /^g+$/.test(p));
  const done = solved || saved.guesses.length >= TRIES;

  const finish = useCallback(
    async (s: Saved) => {
      const res = await fetch(`/api/puzzles/${id}`, { method: "POST", body: JSON.stringify({ type: "result", name: s.name || "Someone", guesses: s.guesses }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const next = { ...s, word: data.word };
        setSaved(next);
        localStorage.setItem(key, JSON.stringify(next));
        load();
      }
    },
    [id, key, load],
  );

  const submit = useCallback(async () => {
    if (done || !info) return;
    if (current.length !== len) {
      setMsg(`Needs ${len} letters`);
      setShake((n) => n + 1);
      return;
    }
    if (!name.trim()) {
      setMsg("Add your name first, so you show up on the board");
      return;
    }
    const res = await fetch(`/api/puzzles/${id}`, { method: "POST", body: JSON.stringify({ type: "guess", guess: current }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Couldn't check that");
      return;
    }
    const next: Saved = { ...saved, name: name.trim(), guesses: [...saved.guesses, current], patterns: [...saved.patterns, data.pattern] };
    persist(next);
    setCurrent("");
    setMsg("");
    if (/^g+$/.test(data.pattern) || next.guesses.length >= TRIES) finish(next);
  }, [current, len, name, done, info, id, saved, finish]); // eslint-disable-line react-hooks/exhaustive-deps

  const type = useCallback(
    (k: string) => {
      if (done) return;
      if (k === "ENTER") return void submit();
      if (k === "BACK") return setCurrent((c) => c.slice(0, -1));
      if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < len ? c + k : c));
    },
    [done, len, submit],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || (e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "Enter") type("ENTER");
      else if (e.key === "Backspace") type("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [type]);

  // best state per letter for the keyboard
  const letterState: Record<string, string> = {};
  saved.guesses.forEach((g, i) =>
    [...g].forEach((ch, j) => {
      const s = saved.patterns[i][j];
      const prev = letterState[ch];
      if (s === "g" || (s === "y" && prev !== "g") || (!prev && s === "x")) letterState[ch] = s;
    }),
  );

  const shareText = `Six Tries by ${info?.by}: ${solved ? saved.guesses.length : "X"}/${TRIES}\n${saved.patterns.map((p) => [...p].map((c) => SQUARE[c]).join("")).join("\n")}\n${typeof window === "undefined" ? "" : location.href}`;

  if (missing)
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-6 sm:pl-20">
        <SiteNav />
        <p className="font-hand text-4xl">This puzzle doesn&rsquo;t exist, or it has expired</p>
        <Link href="/solo/six-tries/new" className="mt-4 inline-block underline underline-offset-4">
          Make your own
        </Link>
      </main>
    );

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />
      <h1 className="font-hand text-5xl font-bold">Six Tries</h1>
      <p className="text-faint">{info ? `${info.by}'s ${info.length}-letter word` : "Loading…"}</p>

      {!saved.guesses.length && !done && (
        <label className="mt-4 block">
          <span className="text-sm font-medium">Your name (for the results board)</span>
          <input
            value={name}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={20}
            className="mt-1 w-full border-b-2 border-ink/30 bg-transparent py-1 font-hand text-3xl outline-none focus:border-ink"
          />
        </label>
      )}

      <div className="mx-auto mt-6 grid w-fit gap-1.5" role="grid" aria-label="Guesses">
        {Array.from({ length: TRIES }, (_, r) => {
          const guess = saved.guesses[r] ?? (r === saved.guesses.length ? current : "");
          const pattern = saved.patterns[r];
          return (
            <div key={r} className={`flex gap-1.5 ${r === saved.guesses.length && shake ? "shake" : ""}`} role="row">
              {Array.from({ length: len }, (_, c) => {
                const ch = guess[c] ?? "";
                const st = pattern?.[c];
                return (
                  <span
                    key={`${r}-${c}-${st ?? ""}`}
                    role="gridcell"
                    className={`flex size-14 items-center justify-center rounded-lg border-2 font-mono text-2xl font-bold uppercase ${
                      st ? `cheer ${TILE[st]}` : ch ? "border-ink/60" : "border-ink/15"
                    }`}
                    style={st ? { animationDelay: `${c * 110}ms` } : undefined}
                  >
                    {ch}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>

      {msg && <p className="pop mt-3 text-center text-sm text-miss">{msg}</p>}

      {!done ? (
        <div className="mt-6 space-y-1.5">
          {ROWS.map((row, i) => (
            <div key={row} className="flex justify-center gap-1">
              {i === 2 && (
                <button onClick={() => type("ENTER")} className="rounded-md bg-ink px-2.5 text-xs font-bold text-paper">
                  Enter
                </button>
              )}
              {[...row].map((k) => (
                <button
                  key={k}
                  onClick={() => type(k)}
                  className={`h-12 w-8 rounded-md border font-mono font-bold transition-colors sm:w-10 ${
                    letterState[k] ? TILE[letterState[k]] : "border-ink/20 bg-surface hover:bg-ink/5"
                  }`}
                >
                  {k}
                </button>
              ))}
              {i === 2 && (
                <button onClick={() => type("BACK")} className="rounded-md border border-ink/20 px-2.5 text-xs font-bold" aria-label="Delete">
                  ⌫
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="pop mt-6 space-y-4 rounded-3xl bg-ink/5 p-5 text-center">
          <p className="font-hand text-5xl font-bold">{solved ? `Got it in ${saved.guesses.length}` : "Out of tries"}</p>
          {saved.word && (
            <p>
              The word was <strong className="font-mono tracking-widest">{saved.word}</strong>
            </p>
          )}
          <button
            onClick={async () => {
              if (navigator.share) await navigator.share({ text: shareText }).catch(() => {});
              else await navigator.clipboard?.writeText(shareText);
            }}
            className="rounded-xl bg-ink px-6 py-3 font-medium text-paper"
          >
            Share result
          </button>
        </div>
      )}

      <section className="mt-10">
        <h2 className="font-hand text-3xl font-bold">Results board</h2>
        {!info?.results.length ? (
          <p className="mt-2 text-sm text-faint">Nobody has finished yet. Be the first.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {info.results.map((r, i) => (
              <li key={r.name + i} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-surface p-3">
                <span className="w-5 font-mono text-faint">{i + 1}</span>
                <span className="flex-1 font-medium">{r.name}</span>
                <span className="grid gap-px" aria-label={`${r.tries} tries`}>
                  {r.rows.map((row, j) => (
                    <span key={j} className="flex gap-px">
                      {[...row].map((c, k) => (
                        <span key={k} className={`size-2.5 rounded-[2px] ${TILE[c].split(" ")[0]}`} />
                      ))}
                    </span>
                  ))}
                </span>
                <span className={`w-12 text-right font-mono font-bold ${r.solved ? "text-hit" : "text-miss"}`}>{r.solved ? `${r.tries}/6` : "X/6"}</span>
              </li>
            ))}
          </ol>
        )}
        {done && (
          <Link href="/solo/six-tries/new" className="mt-6 inline-block underline underline-offset-4">
            Make your own puzzle
          </Link>
        )}
      </section>
    </main>
  );
}
