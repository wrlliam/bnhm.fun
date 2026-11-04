/**
 * Mini Grid crosswords. Grids were filled by a search over common English
 * words (every across and down entry is a real word); clues are hand-written.
 * "#" is a black square.
 */
export type MiniPuzzle = {
  id: number;
  grid: string[];
  across: Record<string, string>; // answer → clue
  down: Record<string, string>;
};

export const MINI_PUZZLES: MiniPuzzle[] = [
  {
    id: 1,
    grid: ["#FAST", "DONOR", "ARGUE", "SCENE", "HELD#"],
    across: { FAST: "Quick", DONOR: "Blood bank giver", ARGUE: "Have a row", SCENE: "Part of a play", HELD: "Kept hold of" },
    down: { DASH: "Sprint", FORCE: "Push hard", ANGEL: "Halo wearer", SOUND: "Noise", TREE: "Oak or ash" },
  },
  {
    id: 2,
    grid: ["WING", "IDEA", "SLAM", "HERE"],
    across: { WING: "Part of a bird or a plane", IDEA: "Bright thought", SLAM: "Shut loudly", HERE: "Not there" },
    down: { WISH: "Birthday-candle request", IDLE: "Doing nothing", NEAR: "Close by", GAME: "Chess or darts" },
  },
  {
    id: 3,
    grid: ["#SLAP", "SCONE", "WEDGE", "ANGEL", "PEER#"],
    across: { SLAP: "Smack with an open hand", SCONE: "Cream tea bake", WEDGE: "Door-stopping block", ANGEL: "Heavenly being", PEER: "Equal, or a lord" },
    down: { SWAP: "Trade", SCENE: "Film moment", LODGE: "Ski chalet", ANGER: "Rage", PEEL: "Banana skin" },
  },
  {
    id: 4,
    grid: ["SHOP", "LAVA", "OVEN", "WERE"],
    across: { SHOP: "Store", LAVA: "Volcano flow", OVEN: "Roasting box", WERE: "'We ___ there'" },
    down: { SLOW: "Not fast", HAVE: "Own", OVER: "Finished", PANE: "Sheet of window glass" },
  },
  {
    id: 5,
    grid: ["MORE", "EVIL", "LESS", "TREE"],
    across: { MORE: "Extra", EVIL: "Villainous", LESS: "Not as much", TREE: "Christmas centrepiece" },
    down: { MELT: "Turn to liquid", OVER: "Above", RISE: "Go up", ELSE: "Otherwise" },
  },
  {
    id: 6,
    grid: ["#STEW", "STOVE", "TAKEN", "AGENT", "RENT#"],
    across: { STEW: "Slow-cooked dish", STOVE: "Hob", TAKEN: "Not free, like a seat", AGENT: "Spy, or estate ___", RENT: "Monthly payment for a flat" },
    down: { STAR: "The sun, for one", STAGE: "Where actors perform", TOKEN: "Arcade coin", EVENT: "Happening", WENT: "Left" },
  },
  {
    id: 7,
    grid: ["CREW", "LAVA", "AGED", "WERE"],
    across: { CREW: "Ship's team", LAVA: "Molten rock", AGED: "Matured, like cheese", WERE: "Past of 'are'" },
    down: { CLAW: "Cat's nail", RAGE: "Fury", EVER: "At any time", WADE: "Walk through water" },
  },
  {
    id: 8,
    grid: ["CHIP", "RIDE", "AREA", "BEAR"],
    across: { CHIP: "Fish's partner", RIDE: "Rollercoaster trip", AREA: "Length times width", BEAR: "Grizzly" },
    down: { CRAB: "Sideways scuttler", HIRE: "Take on staff", IDEA: "Plan", PEAR: "Green or yellow fruit" },
  },
  {
    id: 9,
    grid: ["GRAB", "ROBE", "IDLE", "DEER"],
    across: { GRAB: "Snatch", ROBE: "Dressing gown", IDLE: "Lazy", DEER: "Stag or doe" },
    down: { GRID: "Crossword shape", RODE: "Travelled on horseback", ABLE: "Capable", BEER: "Pint, often" },
  },
  {
    id: 10,
    grid: ["THIS", "HIDE", "AREA", "NEAT"],
    across: { THIS: "Not that", HIDE: "Keep out of sight", AREA: "Region", NEAT: "Tidy" },
    down: { THAN: "Bigger ___ life", HIRE: "Rent, like a car", IDEA: "Notion", SEAT: "Chair" },
  },
];

export type Entry = { num: number; dir: "across" | "down"; row: number; col: number; answer: string; clue: string; cells: [number, number][] };

/** Number the grid like a printed crossword and attach clues. */
export function entries(p: MiniPuzzle): Entry[] {
  const g = p.grid;
  const R = g.length;
  const C = g[0].length;
  const open = (r: number, c: number) => r >= 0 && c >= 0 && r < R && c < C && g[r][c] !== "#";
  const out: Entry[] = [];
  let num = 0;
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      if (!open(r, c)) continue;
      const startsAcross = !open(r, c - 1) && open(r, c + 1);
      const startsDown = !open(r - 1, c) && open(r + 1, c);
      if (!startsAcross && !startsDown) continue;
      num++;
      for (const dir of ["across", "down"] as const) {
        if (dir === "across" ? !startsAcross : !startsDown) continue;
        const cells: [number, number][] = [];
        let rr = r;
        let cc = c;
        while (open(rr, cc)) {
          cells.push([rr, cc]);
          if (dir === "across") cc++;
          else rr++;
        }
        const answer = cells.map(([a, b]) => g[a][b]).join("");
        out.push({ num, dir, row: r, col: c, answer, clue: (dir === "across" ? p.across : p.down)[answer] ?? "?", cells });
      }
    }
  }
  return out;
}
