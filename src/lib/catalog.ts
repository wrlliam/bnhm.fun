/**
 * Every room game in one place: names, blurbs, emblem cards, setup options.
 * Drives the home page, the /new/[kind] setup page, the in-room game switcher
 * and "what's next" at the end of a game. Safe to import from the browser.
 */

export type Suit = "♥" | "♦" | "♠" | "♣";

export type GameOption =
  | { key: string; type: "choice"; label: string; hint?: string; choices: { value: string; label: string; hint?: string }[]; default: string }
  | { key: string; type: "toggle"; label: string; hint?: string; default: boolean };

export type GameMeta = {
  kind: string;
  name: string;
  /** One line on the home page. */
  tagline: string;
  /** Two or three short steps on the setup page. */
  steps: string[];
  category: "party" | "drinking";
  emblem: { rank: string; suit: Suit };
  players: string;
  minPlayers: number;
  /** Rough length, shown on cards. */
  time: string;
  options?: GameOption[];
};

export const TURN_TIMER: GameOption = {
  key: "turnSeconds",
  type: "choice",
  label: "Turn timer",
  hint: "Running out skips the turn",
  choices: [
    { value: "0", label: "Off" },
    { value: "15", label: "15s" },
    { value: "30", label: "30s" },
    { value: "60", label: "60s" },
  ],
  default: "0",
};

export const SPOTLIGHT_PACKS = [
  { value: "friends", label: "Friends", hint: "Easy-going, for any group" },
  { value: "girls-night", label: "Girls' night", hint: "Gossip, dates and dancing" },
  { value: "lads", label: "Lads' night", hint: "Banter and bad decisions" },
  { value: "couples", label: "Couples", hint: "For a table of pairs" },
  { value: "work", label: "Work do", hint: "Safe for colleagues" },
  { value: "family", label: "Family", hint: "Clean, all ages" },
  { value: "spicy", label: "Spicy (18+)", hint: "Cheeky, not explicit" },
  { value: "mix", label: "Mix it up", hint: "A bit of every pack (not Family or Spicy)" },
] as const;

export const GAMES_CATALOG: GameMeta[] = [
  {
    kind: "spotlight",
    name: "Spotlight",
    tagline: "Pick a vibe, answer in secret, then see who said what",
    steps: [
      "Pick a pack like Girls' night or Work do",
      "Each card is a yes/no or a choice between two people in the room",
      "Everyone votes on their phone, then the results show the split and who voted which way",
    ],
    category: "party",
    emblem: { rank: "Q", suit: "♥" },
    players: "3–16",
    minPlayers: 3,
    time: "15 min",
    options: [
      { key: "pack", type: "choice", label: "Question pack", choices: [...SPOTLIGHT_PACKS], default: "friends" },
      {
        key: "rounds",
        type: "choice",
        label: "Questions",
        hint: "Picked at random from the pack, so every game is different",
        choices: [
          { value: "10", label: "10" },
          { value: "20", label: "20" },
          { value: "30", label: "30" },
        ],
        default: "20",
      },
      { key: "anonymous", type: "toggle", label: "Anonymous results", hint: "Show the percentages but hide who voted", default: false },
    ],
  },
  {
    kind: "punchline",
    name: "Punchline",
    tagline: "Write the funniest answer, then vote head to head",
    steps: [
      "Everyone gets two prompts to answer on their phone",
      "Answers face off two at a time on the TV with no names shown",
      "Vote for your favourite and points go to the funniest",
    ],
    category: "party",
    emblem: { rank: "J", suit: "♣" },
    players: "3–12",
    minPlayers: 3,
    time: "15 min",
  },
  {
    kind: "bluff",
    name: "Bluff",
    tagline: "Make up a fake answer to a weird fact and fool your friends",
    steps: [
      "A strange fact appears with a word missing",
      "Everyone writes a believable fake answer",
      "Spot the real one among the fakes: points for finding it and for fooling people",
    ],
    category: "party",
    emblem: { rank: "8", suit: "♠" },
    players: "3–12",
    minPlayers: 3,
    time: "15 min",
  },
  {
    kind: "odd-one-out",
    name: "Odd One Out",
    tagline: "Everyone knows the secret word except one faker",
    steps: [
      "Your phone shows the secret word, unless you're the odd one out",
      "Go round the table and each say one word linked to it",
      "Vote for the faker; if they're caught, they get one guess at the word",
    ],
    category: "party",
    emblem: { rank: "2", suit: "♦" },
    players: "3–12",
    minPlayers: 3,
    time: "5 min a round",
  },
  {
    kind: "most-likely-to",
    name: "Most Likely To",
    tagline: "Vote for who fits the card best; one sip per vote you get",
    steps: ["A card appears on the TV", "Everyone secretly picks a player", "The results show and each vote is a sip"],
    category: "party",
    emblem: { rank: "K", suit: "♠" },
    players: "3–16",
    minPlayers: 3,
    time: "15 min",
  },
  {
    kind: "trivia",
    name: "Trivia",
    tagline: "Questions on the TV, answers on your phone",
    steps: ["Ten questions, 20 seconds each", "Tap one of four answers", "Right and fast scores the most"],
    category: "party",
    emblem: { rank: "9", suit: "♦" },
    players: "1–16",
    minPlayers: 1,
    time: "10 min",
    options: [{ key: "drinkOnWrong", type: "toggle", label: "Drinking mode", hint: "A wrong or missing answer costs a sip", default: false }],
  },
  {
    kind: "hangman",
    name: "Hangman",
    tagline: "One person picks a word, everyone else guesses",
    steps: ["Take turns picking a secret word", "Everyone else guesses letters", "Six misses and the stickman's done"],
    category: "party",
    emblem: { rank: "7", suit: "♣" },
    players: "2–16",
    minPlayers: 2,
    time: "5 min a round",
  },
  {
    kind: "ring-of-fire",
    name: "Ring of Fire",
    tagline: "Draw a card and follow its rule; the fourth King drinks the cup",
    steps: ["Draw on your phone when it's your turn", "Every phone explains the card", "Your phone tells you when to drink"],
    category: "drinking",
    emblem: { rank: "K", suit: "♥" },
    players: "2–16",
    minPlayers: 2,
    time: "45 min",
    options: [TURN_TIMER],
  },
  {
    kind: "never-have-i-ever",
    name: "Never Have I Ever",
    tagline: "Answer in secret; the guilty are revealed together",
    steps: ["Read the card", "Tap I have or Never", "Everyone who has drinks"],
    category: "drinking",
    emblem: { rank: "J", suit: "♦" },
    players: "2–16",
    minPlayers: 2,
    time: "15 min",
  },
  {
    kind: "truth-or-drink",
    name: "Truth or Drink",
    tagline: "Answer the question honestly or drink to dodge it",
    steps: ["Your question pops up on your phone", "Answer out loud, or drink 2 to skip it", "Pass to the next person"],
    category: "drinking",
    emblem: { rank: "10", suit: "♣" },
    players: "2–16",
    minPlayers: 2,
    time: "15 min",
  },
  {
    kind: "higher-lower",
    name: "Higher or Lower",
    tagline: "Call the next card; miss and drink your whole streak",
    steps: ["Higher, lower or equal on your turn", "Right keeps the streak going", "Wrong means drink the streak, then pass"],
    category: "drinking",
    emblem: { rank: "A", suit: "♠" },
    players: "2–16",
    minPlayers: 2,
    time: "10 min",
    options: [TURN_TIMER],
  },
];

export const gameMeta = (kind: string) => GAMES_CATALOG.find((g) => g.kind === kind);

export const CATEGORIES = [
  { id: "party", title: "Party games", hint: "Laughs, votes and bluffing; drinks optional" },
  { id: "drinking", title: "Drinking games", hint: "Phones buzz when it's your turn to drink" },
] as const;

/** Default option values for a game, as the strings/booleans the settings action expects. */
export function defaultOptions(meta: GameMeta) {
  return Object.fromEntries((meta.options ?? []).map((o) => [o.key, o.default]));
}
