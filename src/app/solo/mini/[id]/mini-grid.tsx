"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { entries, type Entry, type MiniPuzzle } from "@/lib/minigrid";

type Dir = "across" | "down";
/** Wall-clock read for event handlers (kept out of the component body). */
const clock = () => Date.now();
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function MiniGrid({ puzzle, total }: { puzzle: MiniPuzzle; total: number }) {
  const R = puzzle.grid.length;
  const C = puzzle.grid[0].length;
  const all = useMemo(() => entries(puzzle), [puzzle]);
  const numberAt = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of all) m.set(`${e.row},${e.col}`, e.num);
    return m;
  }, [all]);

  const blank = () => puzzle.grid.map((row) => [...row].map((ch) => (ch === "#" ? "#" : "")));
  const [fill, setFill] = useState<string[][]>(blank);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [pos, setPosState] = useState<[number, number]>(() => [all[0].row, all[0].col]);
  const [dir, setDirState] = useState<Dir>("across");
  // refs mirror the cursor so fast typing never reads a stale position between renders
  const posRef = useRef<[number, number]>(pos);
  const dirRef = useRef<Dir>(dir);
  const setPos = (p: [number, number]) => {
    posRef.current = p;
    setPosState(p);
  };
  const setDir = (d: Dir) => {
    dirRef.current = d;
    setDirState(d);
  };
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedIn, setFinishedIn] = useState<number | null>(null);
  const [helped, setHelped] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const solved = fill.every((row, r) => row.every((ch, c) => ch === puzzle.grid[r][c]));
  const elapsed = finishedIn ?? (started ? Math.floor((now - started) / 1000) : 0);

  // best time for this puzzle, from this device
  useEffect(() => {
    const v = localStorage.getItem(`mini:${puzzle.id}:best`);
    if (v) queueMicrotask(() => setBest(Number(v)));
  }, [puzzle.id]);

  // tick the clock while solving
  useEffect(() => {
    if (!started || finishedIn !== null) return;
    const t = setInterval(() => setNow(clock()), 500);
    return () => clearInterval(t);
  }, [started, finishedIn]);

  // stop the clock the moment the grid is right
  useEffect(() => {
    if (!solved || finishedIn !== null || !started) return;
    const secs = Math.max(1, Math.floor((clock() - started) / 1000));
    queueMicrotask(() => {
      setFinishedIn(secs);
      if (!helped && (best === null || secs < best)) {
        localStorage.setItem(`mini:${puzzle.id}:best`, String(secs));
        setBest(secs);
      }
    });
  }, [solved, finishedIn, started, helped, best, puzzle.id]);

  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < R && c < C && puzzle.grid[r][c] !== "#";
  const entryAt = (r: number, c: number, d: Dir): Entry | undefined => all.find((e) => e.dir === d && e.cells.some(([a, b]) => a === r && b === c));
  const activeAt = (p: [number, number], d: Dir) => entryAt(p[0], p[1], d) ?? entryAt(p[0], p[1], d === "across" ? "down" : "across")!;
  const active = activeAt(pos, dir);
  const inActive = (r: number, c: number) => active.cells.some(([a, b]) => a === r && b === c);

  const focus = () => input.current?.focus({ preventScroll: true });
  const select = (r: number, c: number) => {
    if (!open(r, c)) return;
    const d = dirRef.current;
    const other: Dir = d === "across" ? "down" : "across";
    if (r === posRef.current[0] && c === posRef.current[1]) {
      if (entryAt(r, c, other)) setDir(other);
    } else {
      setPos([r, c]);
      if (!entryAt(r, c, d)) setDir(other);
    }
    focus();
  };

  // clue order like a printed crossword: all across clues, then all down clues
  const order = useMemo(() => [...all.filter((e) => e.dir === "across"), ...all.filter((e) => e.dir === "down")], [all]);
  const nextClue = (cur: Entry, delta: number) => order[(order.indexOf(cur) + (delta > 0 ? 1 : order.length - 1)) % order.length];

  const step = (delta: number) => {
    const cur = activeAt(posRef.current, dirRef.current);
    const i = cur.cells.findIndex(([a, b]) => a === posRef.current[0] && b === posRef.current[1]);
    const next = cur.cells[i + delta];
    if (next) setPos(next);
    else {
      // run off the end of a word: move to the next clue in reading order
      const e = nextClue(cur, delta);
      setDir(e.dir);
      setPos(delta > 0 ? e.cells[0] : e.cells[e.cells.length - 1]);
    }
  };

  const put = (ch: string) => {
    if (finishedIn !== null) return;
    if (!started) setStarted(clock());
    const [pr, pc] = posRef.current;
    setFill((f) => f.map((row, r) => row.map((x, c) => (r === pr && c === pc ? ch : x))));
    setWrong((w) => {
      const n = new Set(w);
      n.delete(`${pr},${pc}`);
      return n;
    });
    if (ch) step(1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (/^[a-zA-Z]$/.test(k)) put(k.toUpperCase());
    else if (k === "Backspace") {
      const [pr, pc] = posRef.current;
      if (fill[pr][pc]) put("");
      else step(-1);
    } else if (k === "ArrowRight" || k === "ArrowLeft" || k === "ArrowUp" || k === "ArrowDown") {
      const d: Dir = k === "ArrowRight" || k === "ArrowLeft" ? "across" : "down";
      const [pr, pc] = posRef.current;
      if (d !== dirRef.current && entryAt(pr, pc, d)) setDir(d);
      else {
        const [dr, dc] = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k]!;
        let [r, c] = [pr + dr, pc + dc];
        while (r >= 0 && c >= 0 && r < R && c < C && !open(r, c)) [r, c] = [r + dr, c + dc];
        if (open(r, c)) setPos([r, c]);
      }
    } else if (k === "Enter" || k === "Tab") {
      const nxt = nextClue(activeAt(posRef.current, dirRef.current), 1);
      setDir(nxt.dir);
      setPos(nxt.cells[0]);
    } else return;
    e.preventDefault();
  };

  const check = () => {
    setHelped(true);
    const w = new Set<string>();
    fill.forEach((row, r) => row.forEach((ch, c) => ch && ch !== "#" && ch !== puzzle.grid[r][c] && w.add(`${r},${c}`)));
    setWrong(w);
  };
  const reveal = () => {
    setHelped(true);
    if (!started) setStarted(clock());
    setFill(puzzle.grid.map((row) => [...row]));
    setWrong(new Set());
  };
  const reset = () => {
    setFill(blank());
    setWrong(new Set());
    setStarted(null);
    setFinishedIn(null);
    setHelped(false);
  };

  const share = `Mini Grid #${puzzle.id} in ${fmt(elapsed)}${helped ? " (with help)" : ""}`;
  const cell = R > 4 ? "size-14 sm:size-16" : "size-16 sm:size-20";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/solo" className="text-sm text-faint hover:text-ink">
            ← Solo games
          </Link>
          <h1 className="font-hand text-5xl font-bold">Mini Grid #{puzzle.id}</h1>
        </div>
        <div className="text-right">
          <p className={`font-mono text-3xl font-bold tabular-nums ${finishedIn !== null ? "text-hit" : ""}`}>{fmt(elapsed)}</p>
          {best !== null && <p className="text-xs text-faint">Best {fmt(best)}</p>}
        </div>
      </div>

      {/* the current clue, big, right above the grid */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-ink/5 px-4 py-3">
        <span className="font-mono font-bold">
          {active.num}
          {active.dir === "across" ? "A" : "D"}
        </span>
        <span className="text-lg">{active.clue}</span>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[auto_1fr]">
        <div className="relative mx-auto w-fit" onClick={focus}>
          <input
            ref={input}
            onKeyDown={onKey}
            aria-label="Crossword input"
            autoCapitalize="characters"
            autoComplete="off"
            className="absolute inset-0 opacity-0"
            inputMode="text"
          />
          <div className={`grid gap-0 overflow-hidden rounded-xl border-2 border-ink ${solved && finishedIn !== null ? "cheer" : ""}`} style={{ gridTemplateColumns: `repeat(${C}, auto)` }}>
            {fill.map((row, r) =>
              row.map((ch, c) => {
                if (ch === "#") return <span key={`${r}${c}`} className={`${cell} bg-ink`} />;
                const sel = r === pos[0] && c === pos[1];
                const bad = wrong.has(`${r},${c}`);
                return (
                  <button
                    key={`${r}${c}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      select(r, c);
                    }}
                    className={`relative ${cell} border border-ink/25 font-mono text-3xl font-bold uppercase transition-colors ${
                      sel ? "bg-[#f5d76e]" : inActive(r, c) ? "bg-[#cfe3f7]" : "bg-[#fdfcf8]"
                    } ${bad ? "text-[#c62d2d] line-through" : "text-[#1b1b22]"}`}
                    aria-label={`Row ${r + 1}, column ${c + 1}`}
                  >
                    {numberAt.has(`${r},${c}`) && <span className="absolute left-1 top-0.5 text-[11px] font-medium">{numberAt.get(`${r},${c}`)}</span>}
                    {ch}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 text-sm md:grid-cols-1">
          {(["across", "down"] as const).map((d) => (
            <div key={d}>
              <h2 className="mb-2 font-medium capitalize">{d}</h2>
              <ol className="space-y-1">
                {all
                  .filter((e) => e.dir === d)
                  .map((e) => (
                    <li key={e.num + d}>
                      <button
                        onClick={() => {
                          setDir(d);
                          setPos(e.cells[0]);
                          focus();
                        }}
                        className={`w-full rounded-lg px-2 py-1 text-left transition-colors ${e === active ? "bg-[#cfe3f7] text-[#1b1b22]" : "hover:bg-ink/5"}`}
                      >
                        <span className="mr-2 font-mono font-bold">{e.num}</span>
                        {e.clue}
                      </button>
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      </div>

      {finishedIn !== null ? (
        <div className="pop mt-8 rounded-3xl bg-hit/15 p-6 text-center">
          <p className="font-hand text-5xl font-bold">Solved in {fmt(finishedIn)}</p>
          {helped && <p className="text-sm text-faint">With a little help, so it doesn&rsquo;t count as a best time</p>}
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={async () => {
                const text = `${share}\n${location.href}`;
                if (navigator.share) await navigator.share({ text }).catch(() => {});
                else await navigator.clipboard?.writeText(text);
              }}
              className="rounded-xl bg-ink px-5 py-3 font-medium text-paper"
            >
              Share time
            </button>
            {puzzle.id < total && (
              <Link href={`/solo/mini/${puzzle.id + 1}`} className="rounded-xl border-2 border-ink px-5 py-2.5 font-medium">
                Next puzzle
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <button onClick={check} className="underline underline-offset-4">
            Check
          </button>
          <button onClick={reveal} className="underline underline-offset-4">
            Reveal
          </button>
          <button onClick={reset} className="text-faint underline underline-offset-4">
            Clear
          </button>
        </div>
      )}
    </main>
  );
}
