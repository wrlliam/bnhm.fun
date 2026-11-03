export const SUITS = [
  { key: "S", symbol: "♠", red: false },
  { key: "H", symbol: "♥", red: true },
  { key: "D", symbol: "♦", red: true },
  { key: "C", symbol: "♣", red: false },
] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export type Card = { rank: (typeof RANKS)[number]; suit: (typeof SUITS)[number] };

export type Deal = { players: string[]; perHand: number; seed: string };

export const MAX_PLAYERS = 10;

export function newSeed() {
  return Math.random().toString(36).slice(2, 8);
}

// Deterministic PRNG so the same seed always deals the same hands.
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle of a copy of `items`, deterministic for a given seed. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const rand = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Full 52-card deck, shuffled deterministically from `seed`. */
export function shuffle(seed: string): Card[] {
  return seededShuffle(
    SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit }))),
    seed,
  );
}

/** Ace low (1) … King high (13). */
export function rankValue(card: Card) {
  return RANKS.indexOf(card.rank) + 1;
}

export function deal({ players, perHand, seed }: Deal): Card[][] {
  const deck = shuffle(seed);
  return players.map((_, p) => deck.slice(p * perHand, p * perHand + perHand));
}

export function maxPerHand(playerCount: number) {
  return Math.floor(52 / Math.max(1, playerCount));
}

export function dealToQuery(d: Deal, me?: number) {
  const q = new URLSearchParams({ s: d.seed, n: String(d.perHand), p: d.players.join(",") });
  if (me !== undefined) q.set("me", String(me));
  return q.toString();
}

export function parseDeal(q: URLSearchParams): (Deal & { me: number | null }) | null {
  const seed = q.get("s");
  const players = (q.get("p") ?? "")
    .split(",")
    .map((n) => n.trim().slice(0, 20))
    .filter(Boolean)
    .slice(0, MAX_PLAYERS);
  const perHand = Number(q.get("n"));
  if (!seed || players.length === 0 || !Number.isInteger(perHand) || perHand < 1) return null;
  if (perHand > maxPerHand(players.length)) return null;
  const meRaw = q.get("me");
  const me = meRaw !== null && Number(meRaw) >= 0 && Number(meRaw) < players.length ? Number(meRaw) : null;
  return { seed, players, perHand, me };
}
