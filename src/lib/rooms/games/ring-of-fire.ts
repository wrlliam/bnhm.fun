import { type Card, newSeed, shuffle } from "@/lib/cards";
import { RANK_ORDER, RULES } from "@/lib/ring-of-fire";
import { type Actor, addDrink, cancelTimer, GameError, isOnline, requireDrinksDone, schedule, waitingOn, type GameModule, type Room, playerName } from "../core";

type Rank = Card["rank"];

/** What the drawer has to decide after drawing this rank (null = resolves itself). */
export const CHOICE: Record<Rank, null | { kind: "one" | "many" | "mate" | "rule"; prompt: string }> = {
  A: null,
  "2": { kind: "one", prompt: "Who has to drink?" },
  "3": null,
  "4": { kind: "one", prompt: "Who was last to touch the floor?" },
  "5": { kind: "many", prompt: "Tap every guy, then confirm." },
  "6": { kind: "many", prompt: "Tap every girl, then confirm." },
  "7": { kind: "one", prompt: "Who was last to point at the sky?" },
  "8": { kind: "mate", prompt: "Pick your mate — they drink whenever you do." },
  "9": { kind: "one", prompt: "Who messed up the rhyme?" },
  "10": { kind: "one", prompt: "Who blanked on the category?" },
  J: { kind: "rule", prompt: "Make a new rule — or call a vote to scrap one." },
  Q: null,
  K: null,
};

/** Cards that target everyone in a group, resolved automatically when everyone's group is known. */
const GROUP_CARD: Partial<Record<Rank, "guy" | "girl">> = { "5": "guy", "6": "girl" };

export type RofState = {
  status: "lobby" | "playing" | "finished";
  seed: string;
  drawn: number[]; // indices into shuffle(seed), in draw order
  disabled: Rank[];
  turnOrder: string[];
  turn: number;
  current: null | {
    card: Card;
    by: string;
    pending: boolean;
    outcome: string | null;
  };
  mates: [string, string][]; // [a, b]: when a drinks, b drinks too
  rules: { id: number; text: string; by: string }[];
  ruleSeq: number;
  /** A Jack was used to call a vote on scrapping a rule. Blocks the game until closed. */
  vote: null | { ruleId: number; by: string; votes: Record<string, boolean> };
  questionMaster: string | null;
  kings: number;
  /** Turn timer: seconds per turn (0 = off) and when the current turn runs out. */
  turnSeconds: number;
  deadline: number | null;
  /** Endless mode: a fresh deck is shuffled in whenever this one runs out. */
  endless: boolean;
  /** Which deck we're on (1 = first); goes up each time play continues with a new deck. */
  deckNo: number;
  log: { id: number; text: string }[];
  logSeq: number;
};

type R = Room<RofState>;

function log(room: R, text: string) {
  const s = room.state;
  s.log.push({ id: ++s.logSeq, text });
  if (s.log.length > 50) s.log.shift();
}

/** Make someone drink, plus their mates (and their mates' mates…). */
function drink(room: R, playerId: string, amount: number, reason: string) {
  const seen = new Set<string>();
  const queue: { id: string; via: string | null }[] = [{ id: playerId, via: null }];
  while (queue.length) {
    const { id, via } = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    addDrink(room, id, amount, via ? `${reason} — you're ${playerName(room, via)}'s mate` : reason);
    for (const [a, b] of room.state.mates) if (a === id) queue.push({ id: b, via: id });
  }
}

/** Close the rule vote: majority yes scraps the rule (a tie keeps it), then play moves on. */
function closeVote(room: R, force?: boolean, why?: string) {
  const s = room.state;
  const v = s.vote;
  if (!v) return;
  const rule = s.rules.find((r) => r.id === v.ruleId);
  const yes = Object.values(v.votes).filter(Boolean).length;
  const no = Object.values(v.votes).length - yes;
  const scrapped = force || yes > no;
  if (scrapped) s.rules = s.rules.filter((r) => r.id !== v.ruleId);
  const text = rule ? `“${rule.text}”` : "the rule";
  const outcome = why
    ? `Rule ${text} removed — ${why}.`
    : scrapped
      ? `Vote ${yes}–${no}: rule ${text} is scrapped.`
      : `Vote ${yes}–${no}: rule ${text} stays.`;
  s.vote = null;
  if (s.current?.pending) {
    s.current.pending = false;
    s.current.outcome = outcome;
    log(room, outcome);
    advance(room);
  }
}

/** Close automatically once everyone who's online has voted. */
function maybeCloseVote(room: R) {
  const v = room.state.vote;
  if (!v) return;
  const online = room.players.filter((p) => isOnline(room, p.id));
  if (online.length && online.every((p) => p.id in v.votes)) closeVote(room);
}

function isMate(s: RofState, a: string, b: string) {
  return s.mates.some(([x, y]) => x === a && y === b);
}

function whoDrinks(room: R, ids: string[]) {
  return `${ids.map((id) => playerName(room, id)).join(", ")} ${ids.length === 1 ? "drinks" : "drink"}.`;
}

function deck(s: RofState) {
  return shuffle(s.seed);
}

function remaining(s: RofState) {
  const d = deck(s);
  return d.filter((c, i) => !s.drawn.includes(i) && !s.disabled.includes(c.rank)).length;
}

function turnPlayer(s: RofState) {
  return s.turnOrder.length ? s.turnOrder[s.turn % s.turnOrder.length] : null;
}

function advance(room: R) {
  const s = room.state;
  if (s.turnOrder.length) s.turn = (s.turn + 1) % s.turnOrder.length;
  if (remaining(s) === 0) {
    if (s.endless) newDeck(room);
    else {
      s.status = "finished";
      log(room, "The deck is empty");
    }
  }
  armTurnTimer(room);
}

/**
 * Keep the party going with a freshly shuffled deck. Turn order, mates, rules and
 * the question master carry over; the King count starts again for a new cup.
 */
function newDeck(room: R) {
  const s = room.state;
  s.seed = newSeed();
  s.drawn = [];
  s.kings = 0;
  s.current = null;
  s.deckNo++;
  s.status = "playing";
  log(room, `Deck ${s.deckNo} shuffled in. Keep going, and refill the King's cup`);
}

/** (Re)start the per-turn clock. Running out skips the turn (and any unfinished choice). */
function armTurnTimer(room: R) {
  const s = room.state;
  cancelTimer(room, "turn");
  s.deadline = null;
  if (!s.turnSeconds || s.status !== "playing" || s.vote) return;
  s.deadline = Date.now() + s.turnSeconds * 1000;
  const key = `${s.turn}:${s.drawn.length}`;
  schedule(room, "turn", s.turnSeconds * 1000, () => {
    const st = room.state;
    if (st.status !== "playing" || `${st.turn}:${st.drawn.length}` !== key || st.vote) return;
    if (waitingOn(room).length) return armTurnTimer(room); // drinks first, then a fresh clock
    if (st.current?.pending) {
      st.current.pending = false;
      st.current.outcome = "Time's up — no choice made.";
    }
    log(room, `Time's up for ${playerName(room, turnPlayer(st) ?? "")} — turn skipped`);
    advance(room);
  });
}

function resolveAuto(room: R, card: Card, by: string) {
  const s = room.state;
  const name = playerName(room, by);
  switch (card.rank) {
    case "A":
      for (const p of room.players) addDrink(room, p.id, 1, `Waterfall (${name} drew an Ace) — start drinking, stop after the person before you`);
      return "Waterfall! Everyone drinks.";
    case "5":
    case "6": {
      const group = GROUP_CARD[card.rank]!;
      const ids = room.players.filter((p) => p.group === group).map((p) => p.id);
      for (const id of ids) drink(room, id, 1, `${name} drew a ${card.rank} (${RULES[card.rank].name}) — that's you`);
      return ids.length ? whoDrinks(room, ids) : `No ${group}s here — nobody drinks.`;
    }
    case "8":
      return `${name} already has everyone as a mate — nobody new to pick.`;
    case "3":
      drink(room, by, 1, `You drew a 3 (Me)`);
      return `${name} drinks.`;
    case "Q":
      s.questionMaster = by;
      return `${name} is now question master.`;
    case "K": {
      s.kings++;
      if (s.kings >= 4) {
        drink(room, by, 0, "Fourth King — drink the King's cup!");
        return `Fourth King! ${name} drinks the King's cup.`;
      }
      return `${name} pours into the King's cup. ${4 - s.kings} to go.`;
    }
    default:
      return null;
  }
}

function requireHost(actor: Actor) {
  if (!actor.isHost) throw new GameError("Only the host can do that", 403);
}

function view(room: R) {
  const s = room.state;
  const kingsOn = !s.disabled.includes("K");
  return {
    status: s.status,
    disabled: s.disabled,
    left: remaining(s),
    drawnCount: s.drawn.length,
    turnPlayerId: s.status === "playing" ? turnPlayer(s) : null,
    turnOrder: s.turnOrder,
    current: s.current,
    choice: s.current?.pending ? CHOICE[s.current.card.rank] : null,
    /** For Guys / Girls: players already known to be in the group, pre-selected in the picker. */
    suggested: (() => {
      const group = s.current?.pending ? GROUP_CARD[s.current.card.rank] : undefined;
      return group ? room.players.filter((p) => p.group === group).map((p) => p.id) : [];
    })(),
    mates: s.mates,
    rules: s.rules,
    vote: s.vote
      ? { ...s.vote, text: s.rules.find((r) => r.id === s.vote!.ruleId)?.text ?? "" }
      : null,
    questionMaster: s.questionMaster,
    kings: s.kings,
    kingsOn,
    log: s.log.slice(-15),
    turnSeconds: s.turnSeconds,
    deadline: s.deadline,
    endless: s.endless,
    deckNo: s.deckNo,
  };
}

export type RingOfFireView = ReturnType<typeof view>;

export const ringOfFire: GameModule<RofState> = {
  kind: "ring-of-fire",
  title: "Ring of Fire",
  minPlayers: 2,

  init: () => ({
    status: "lobby",
    seed: newSeed(),
    drawn: [],
    disabled: [],
    turnOrder: [],
    turn: 0,
    current: null,
    mates: [],
    rules: [],
    ruleSeq: 0,
    vote: null,
    questionMaster: null,
    kings: 0,
    turnSeconds: 0,
    deadline: null,
    endless: false,
    deckNo: 1,
    log: [],
    logSeq: 0,
  }),

  onJoin(room, player) {
    if (room.state.status !== "lobby") room.state.turnOrder.push(player.id);
  },

  onLeave(room, playerId) {
    const s = room.state;
    if (s.vote) {
      delete s.vote.votes[playerId];
      if (s.vote.by === playerId) closeVote(room, false, undefined);
    }
    const idx = s.turnOrder.indexOf(playerId);
    if (idx >= 0) {
      s.turnOrder.splice(idx, 1);
      if (idx < s.turn) s.turn--;
      if (s.turnOrder.length) s.turn %= s.turnOrder.length;
      else s.turn = 0;
    }
    s.mates = s.mates.filter(([a, b]) => a !== playerId && b !== playerId);
    if (s.questionMaster === playerId) s.questionMaster = null;
    if (s.current?.by === playerId && s.current.pending) {
      s.current.pending = false;
      s.current.outcome = "Skipped — player left.";
    }
  },

  act(room: R, actor, action) {
    const s = room.state;
    switch (action.type) {
      case "timer": {
        // also the setup-page options entry point
        requireHost(actor);
        if (action.turnSeconds !== undefined) {
          s.turnSeconds = [0, 15, 30, 60].includes(Number(action.turnSeconds)) ? Number(action.turnSeconds) : 0;
          armTurnTimer(room);
        }
        if (action.endless !== undefined) s.endless = !!action.endless;
        return;
      }
      case "endless": {
        // switch endless on/off; switching it on at the end of a deck carries straight on
        requireHost(actor);
        s.endless = !!action.on;
        log(room, s.endless ? "Endless mode on: new decks keep coming" : "Endless mode off: the game ends with this deck");
        if (s.endless && s.status === "finished") {
          newDeck(room);
          armTurnTimer(room);
        }
        return;
      }
      case "continue": {
        requireHost(actor);
        if (s.status !== "finished") throw new GameError("The deck hasn't run out yet");
        newDeck(room);
        armTurnTimer(room);
        return;
      }
      case "settings": {
        requireHost(actor);
        const ranks = Array.isArray(action.disabled) ? action.disabled : [];
        s.disabled = RANK_ORDER.filter((r) => ranks.includes(r));
        if (s.disabled.length === RANK_ORDER.length) throw new GameError("Leave at least one card type on");
        log(room, s.disabled.length ? `Host turned off: ${s.disabled.join(", ")}` : "All cards are on");
        if (s.status === "playing" && remaining(s) === 0) s.status = "finished";
        return;
      }
      case "start": {
        requireHost(actor);
        if (room.players.length < 2) throw new GameError("Need at least 2 players");
        Object.assign(s, {
          ...ringOfFire.init(),
          disabled: s.disabled,
          turnSeconds: s.turnSeconds,
          endless: s.endless,
          status: "playing",
          turnOrder: room.players.map((p) => p.id),
        });
        for (const d of room.drinks) d.acked = true; // fresh game, fresh slate
        log(room, `Game on! ${playerName(room, s.turnOrder[0])} draws first.`);
        armTurnTimer(room);
        return;
      }
      case "draw": {
        if (s.status !== "playing") throw new GameError("The game hasn't started");
        const who = turnPlayer(s);
        if (!who) throw new GameError("No players");
        if (actor.player?.id !== who && !actor.isHost) throw new GameError("It's not your turn", 403);
        if (s.current?.pending) throw new GameError("Finish the last card first");
        requireDrinksDone(room);
        const d = deck(s);
        const idx = d.findIndex((c, i) => !s.drawn.includes(i) && !s.disabled.includes(c.rank));
        if (idx < 0) {
          s.status = "finished";
          return;
        }
        s.drawn.push(idx);
        const card = d[idx];
        let choice = CHOICE[card.rank];
        // Guys / Girls: if everyone said which they are when joining, no need to ask
        const group = GROUP_CARD[card.rank];
        if (group && room.players.every((p) => p.group)) choice = null;
        // Mate: if every other player is already your mate there's nobody left to pick
        if (card.rank === "8" && room.players.every((p) => p.id === who || isMate(s, who, p.id))) choice = null;
        s.current = { card, by: who, pending: !!choice, outcome: null };
        log(room, `${playerName(room, who)} drew ${card.rank}${card.suit.symbol}`);
        if (!choice) {
          s.current.outcome = resolveAuto(room, card, who);
          if (s.current.outcome) log(room, s.current.outcome);
          advance(room);
        }
        return;
      }
      case "choose": {
        const cur = s.current;
        if (!cur?.pending) throw new GameError("Nothing to choose");
        if (s.vote) throw new GameError("A vote is already running");
        if (actor.player?.id !== cur.by && !actor.isHost) throw new GameError("Only the drawer can choose", 403);
        const choice = CHOICE[cur.card.rank]!;
        const by = playerName(room, cur.by);
        const ids = (Array.isArray(action.targets) ? action.targets : []).filter((id): id is string =>
          room.players.some((p) => p.id === id),
        );
        const rule = `${cur.card.rank} · ${RULES[cur.card.rank].name}`;
        if (choice.kind === "one") {
          if (ids.length !== 1) throw new GameError("Pick one person");
          drink(room, ids[0], 1, `${by} drew ${rule} and picked you`);
          cur.outcome = `${playerName(room, ids[0])} drinks.`;
        } else if (choice.kind === "many") {
          for (const id of ids) drink(room, id, 1, `${rule} — that's you`);
          cur.outcome = ids.length ? whoDrinks(room, ids) : "Nobody drinks.";
        } else if (choice.kind === "mate") {
          if (ids.length !== 1 || ids[0] === cur.by) throw new GameError("Pick someone else as your mate");
          if (isMate(s, cur.by, ids[0])) {
            throw new GameError(`${playerName(room, ids[0])} is already your mate — pick someone new`);
          }
          s.mates.push([cur.by, ids[0]]);
          cur.outcome = `${playerName(room, ids[0])} is ${by}'s mate. When ${by} drinks, they drink.`;
        } else if (action.mode === "removeVote") {
          // the Jack is spent on a vote instead of a new rule
          const rule = s.rules.find((r) => r.id === Number(action.ruleId));
          if (!rule) throw new GameError("Pick a rule to vote on");
          s.vote = { ruleId: rule.id, by: cur.by, votes: {} };
          log(room, `${by} called a vote to scrap the rule “${rule.text}”`);
          return; // card stays pending until the vote closes
        } else {
          const text = String(action.text ?? "")
            .trim()
            .slice(0, 120);
          if (!text) throw new GameError("Write the rule");
          s.rules.push({ id: ++s.ruleSeq, text, by: cur.by });
          cur.outcome = `New rule: “${text}”`;
        }
        cur.pending = false;
        log(room, cur.outcome);
        advance(room);
        return;
      }
      case "penalty": {
        // host, or the question master catching someone out
        const target = String(action.playerId ?? "");
        if (!room.players.some((p) => p.id === target)) throw new GameError("No such player");
        const isQm = !!actor.player && actor.player.id === s.questionMaster;
        if (!actor.isHost && !isQm) throw new GameError("Only the host or question master can do that", 403);
        const reason = isQm && !actor.isHost ? `You answered the question master (${playerName(room, s.questionMaster!)})` : String(action.reason || "The host says drink — rule broken?");
        drink(room, target, 1, reason);
        log(room, `${playerName(room, target)} drinks: ${reason}`);
        return;
      }
      case "skip": {
        requireHost(actor);
        if (s.current?.pending) {
          s.current.pending = false;
          s.current.outcome = "Skipped by the host.";
        }
        log(room, `Host skipped ${playerName(room, turnPlayer(s) ?? "")}'s turn`);
        advance(room);
        return;
      }
      case "addMate": {
        requireHost(actor);
        const a = String(action.a ?? "");
        const b = String(action.b ?? "");
        const exists = (id: string) => room.players.some((p) => p.id === id);
        if (!exists(a) || !exists(b) || a === b) throw new GameError("Pick two different players");
        const wanted: [string, string][] = action.both ? [[a, b], [b, a]] : [[a, b]];
        const missing = wanted.filter(([x, y]) => !isMate(s, x, y));
        if (!missing.length) {
          throw new GameError(`${playerName(room, a)} and ${playerName(room, b)} are already partners`);
        }
        s.mates.push(...missing);
        log(room, `Host paired ${playerName(room, a)} → ${playerName(room, b)}${action.both ? " (both ways)" : ""}`);
        return;
      }
      case "removeMate": {
        requireHost(actor);
        s.mates = s.mates.filter(([a, b]) => !(a === action.a && b === action.b));
        return;
      }
      case "removeRule": {
        requireHost(actor);
        const rule = s.rules.find((r) => r.id === Number(action.id));
        if (!rule) throw new GameError("That rule is already gone");
        if (s.vote?.ruleId === rule.id) closeVote(room, true, "the host scrapped it");
        else s.rules = s.rules.filter((r) => r.id !== rule.id);
        log(room, `Host removed the rule “${rule.text}”`);
        return;
      }
      case "ruleVote": {
        if (!actor.player) throw new GameError("Join the room first", 403);
        if (!s.vote) throw new GameError("No vote running");
        s.vote.votes[actor.player.id] = !!action.yes;
        maybeCloseVote(room);
        return;
      }
      case "closeVote": {
        requireHost(actor);
        if (!s.vote) throw new GameError("No vote running");
        closeVote(room);
        return;
      }
      case "reset": {
        requireHost(actor);
        room.state = { ...ringOfFire.init(), disabled: s.disabled, turnSeconds: s.turnSeconds, endless: s.endless };
        return;
      }
      default:
        throw new GameError("Unknown action");
    }
  },

  view,
  restore: (room) => armTurnTimer(room),
};
