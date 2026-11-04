/**
 * Six Tries: word puzzles made from your own word, shared by link, with a
 * results board. The word never leaves the server until you finish; every
 * guess is scored here, and submitted results are re-scored so they can't be faked.
 */
import { GameError } from "./rooms/core";
import { redis } from "./rooms/persist";

export const MAX_TRIES = 6;
const TTL_SECONDS = 60 * 60 * 24 * 60; // 60 days
const KEY = (id: string) => `bnhm:puzzle:${id}`;

export type Result = { name: string; solved: boolean; tries: number; rows: string[]; at: number };
export type Puzzle = { id: string; word: string; by: string; createdAt: number; results: Result[] };

const g = globalThis as unknown as { __puzzles?: Map<string, Puzzle> };
const memory = (g.__puzzles ??= new Map());

/** g = right letter, right spot · y = in the word, wrong spot · x = not in the word. */
export function score(guess: string, word: string): string {
  const out = Array<string>(word.length).fill("x");
  const left: Record<string, number> = {};
  for (let i = 0; i < word.length; i++) {
    if (guess[i] === word[i]) out[i] = "g";
    else left[word[i]] = (left[word[i]] ?? 0) + 1;
  }
  for (let i = 0; i < word.length; i++) {
    if (out[i] === "g") continue;
    if (left[guess[i]] > 0) {
      out[i] = "y";
      left[guess[i]]--;
    }
  }
  return out.join("");
}

export function cleanWord(raw: unknown) {
  const w = String(raw ?? "").trim().toUpperCase();
  if (!/^[A-Z]{4,7}$/.test(w)) throw new GameError("Use one word of 4 to 7 letters, A–Z only");
  return w;
}

const cleanName = (raw: unknown) => String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 20) || "Someone";

async function save(p: Puzzle) {
  memory.set(p.id, p);
  const client = await redis();
  await client?.set(KEY(p.id), JSON.stringify(p), { EX: TTL_SECONDS }).catch(() => {});
}

export async function getPuzzle(id: string): Promise<Puzzle> {
  if (!/^[a-z0-9]{6,12}$/.test(id)) throw new GameError("Puzzle not found", 404);
  const cached = memory.get(id);
  if (cached) return cached;
  const client = await redis();
  const json = await client?.get(KEY(id)).catch(() => null);
  if (!json) throw new GameError("Puzzle not found", 404);
  const p = JSON.parse(json) as Puzzle;
  memory.set(id, p);
  return p;
}

export async function createPuzzle(word: unknown, by: unknown) {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const p: Puzzle = { id, word: cleanWord(word), by: cleanName(by), createdAt: Date.now(), results: [] };
  await save(p);
  return p;
}

export async function checkGuess(id: string, guess: unknown) {
  const p = await getPuzzle(id);
  const g = String(guess ?? "").toUpperCase();
  if (g.length !== p.word.length || !/^[A-Z]+$/.test(g)) throw new GameError(`Guess a ${p.word.length}-letter word`);
  return { pattern: score(g, p.word) };
}

/** Record a finished game. Re-scores the guesses here; returns the word now that they're done. */
export async function submitResult(id: string, name: unknown, guesses: unknown) {
  const p = await getPuzzle(id);
  const list = (Array.isArray(guesses) ? guesses : []).map((x) => String(x).toUpperCase()).slice(0, MAX_TRIES);
  if (!list.length || list.some((x) => x.length !== p.word.length || !/^[A-Z]+$/.test(x))) throw new GameError("Invalid guesses");
  const solvedAt = list.indexOf(p.word);
  const solved = solvedAt >= 0;
  if (!solved && list.length < MAX_TRIES) throw new GameError("Keep going, you still have tries left");
  const used = solved ? list.slice(0, solvedAt + 1) : list;
  const result: Result = { name: cleanName(name), solved, tries: used.length, rows: used.map((x) => score(x, p.word)), at: Date.now() };
  p.results = [...p.results.filter((r) => r.name.toLowerCase() !== result.name.toLowerCase()), result].slice(-200);
  await save(p);
  return { word: p.word, result };
}

/** Public view: everything except the word. */
export function publicPuzzle(p: Puzzle) {
  return {
    id: p.id,
    length: p.word.length,
    by: p.by,
    createdAt: p.createdAt,
    results: [...p.results].sort((a, b) => Number(b.solved) - Number(a.solved) || a.tries - b.tries || a.at - b.at),
  };
}
