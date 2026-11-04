"use client";

import { useEffect, useRef } from "react";
import { PlayingCard } from "@/components/playing-card";
import { AdminAccess } from "@/components/room/admin-access";
import { Avatar } from "@/components/room/avatar";
import { WaitingForDrinks } from "@/components/room/drink-alert";
import { act, BigButton, openTv, RoomShell } from "@/components/room/room-shell";
import { buzz, playSound } from "@/lib/feedback";
import type { RoomView, StreamStatus } from "@/lib/rooms/client";
import { RULES } from "@/lib/ring-of-fire";
import { Countdown, TurnTimerSetting } from "@/components/room/game-bits";
import { CardSettings, Chooser, game, nameOf, PairsEditor, playerOf, RemoveRule, type RofProps, RuleVote } from "./shared";

/**
 * Phone view. Kept deliberately simple: what you need to do now, the last card,
 * and anything that affects you personally. Everything else is in the Menu.
 */
export function RofPlayer(props: RofProps & { status: StreamStatus; token: string }) {
  const { room, token, hostToken, status } = props;
  const g = game(room);

  const menu = room.isHost ? (
    <div className="space-y-3">
      <TurnTimerSetting room={room} value={g.turnSeconds} />
      <details>
        <summary className="cursor-pointer text-sm font-medium">Host: drinking partners</summary>
        <div className="mt-3">
          <PairsEditor room={room} hostToken={hostToken} />
        </div>
      </details>
      <details>
        <summary className="cursor-pointer text-sm font-medium">Host: choose which cards are in play</summary>
        <div className="mt-3">
          <CardSettings room={room} hostToken={hostToken} compact />
        </div>
      </details>
    </div>
  ) : null;

  return (
    <RoomShell room={room} status={status} token={token} hostToken={hostToken} menu={menu}>
      {g.status === "lobby" ? <Lobby {...props} /> : <InGame {...props} />}
    </RoomShell>
  );
}

export function WhoIsHere({ room }: { room: RoomView }) {
  return (
    <div>
      <p className="text-sm text-faint">
        {room.players.length} {room.players.length === 1 ? "player" : "players"} here
      </p>
      <div className="mt-2 flex flex-wrap gap-3">
        {room.players.map((p) => (
          <span key={p.id} className="flex flex-col items-center gap-1">
            <Avatar player={p} size={52} dim={!p.online} />
            <span className="font-hand text-xl">{p.id === room.me ? "You" : p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Lobby({ room, token, hostToken }: RofProps) {
  return (
    <div className="pop space-y-6">
      <div>
        <h2 className="font-hand text-5xl font-bold">You&rsquo;re in</h2>
        <p className="mt-1 text-faint">
          {room.isHost ? "Start when everyone has joined." : "Waiting for the host to start the game."}
        </p>
      </div>

      <WhoIsHere room={room} />

      {room.isHost && (
        <div className="space-y-3">
          <BigButton
            className="w-full py-4 text-lg"
            disabled={room.players.length < 2}
            onClick={() => act(room, token, hostToken, { type: "start" })}
          >
            {room.players.length < 2 ? "Waiting for at least 2 players" : `Start with ${room.players.length} players`}
          </BigButton>
          <button
            onClick={() => openTv(room.code)}
            className="w-full rounded-md border-2 border-ink py-3 font-medium transition-colors hover:bg-ink hover:text-paper"
          >
            Open the TV screen
          </button>
          <AdminAccess room={room} hostToken={hostToken} />
          <TurnTimerSetting room={room} value={game(room).turnSeconds} />
          <details className="pt-2">
            <summary className="cursor-pointer text-sm font-medium">Drinking partners (optional): drink together</summary>
            <div className="mt-3">
              <PairsEditor room={room} hostToken={hostToken} />
            </div>
          </details>
          <details className="pt-2">
            <summary className="cursor-pointer text-sm font-medium">Choose which cards are in play</summary>
            <div className="mt-3">
              <CardSettings room={room} hostToken={hostToken} compact />
            </div>
          </details>
        </div>
      )}

      <p className="text-sm text-faint">
        How it works: on your turn you draw on this phone. Every phone explains the card. If you have to drink, this
        phone goes red and buzzes. Draw an 8 (Mate) to pick a drinking partner who drinks whenever you do.
      </p>
    </div>
  );
}

function InGame({ room, token, hostToken }: RofProps) {
  const g = game(room);
  const me = room.me!;
  const cur = g.current;
  const drinksPending = room.waitingOn.length > 0;
  const myTurn = g.status === "playing" && g.turnPlayerId === me && !cur?.pending;
  const iChoose = !!cur?.pending && cur.by === me;
  const canDrawNow = myTurn && !drinksPending;

  // chime + buzz the moment it becomes your go
  const wasMyGo = useRef(false);
  useEffect(() => {
    if (canDrawNow && !wasMyGo.current) {
      playSound("turn");
      buzz(80);
    }
    wasMyGo.current = canDrawNow;
  }, [canDrawNow]);

  return (
    <div className="space-y-6">
      {/* 1. What to do right now */}
      {g.status === "finished" ? (
        <Banner tone="ink">
          That&rsquo;s the whole deck — game over!
          {room.isHost && (
            <button
              onClick={() => act(room, token, hostToken, { type: "reset" })}
              className="mt-3 block w-full rounded-md bg-paper py-3 font-medium text-ink"
            >
              Back to the lobby
            </button>
          )}
        </Banner>
      ) : myTurn && drinksPending ? (
        <div className="space-y-3">
          <div className="w-full rounded-2xl bg-hit/30 px-6 py-6 text-center">
            <span className="block font-hand text-5xl font-bold leading-none">Your turn next</span>
            <span className="mt-2 block">You can draw once everyone has finished drinking.</span>
          </div>
          <WaitingForDrinks room={room} hostToken={hostToken} />
        </div>
      ) : myTurn ? (
        <button
          onClick={() => act(room, token, hostToken, { type: "draw" })}
          className="pop w-full rounded-2xl bg-hit px-6 py-8 text-center text-paper shadow-md transition-[transform,background-color,border-color,color,opacity] active:scale-[0.98]"
        >
          <span className="block font-hand text-6xl font-bold leading-none">Your turn</span>
          <span className="mt-2 block text-lg">Tap here to draw a card</span>
          {g.deadline && (
            <span className="mt-3 inline-block">
              <Countdown deadline={g.deadline} />
            </span>
          )}
        </button>
      ) : g.vote ? (
        <RuleVote room={room} token={token} hostToken={hostToken} />
      ) : iChoose ? (
        <Banner tone="hit">Your card — {g.choice?.prompt.toLowerCase()}</Banner>
      ) : cur?.pending ? (
        <Waiting room={room} id={cur.by} text={`is choosing (${RULES[cur.card.rank].name})…`} />
      ) : (
        <div className="space-y-3">
          <Waiting room={room} id={g.turnPlayerId} text="is drawing next" />
          <WaitingForDrinks room={room} hostToken={hostToken} />
        </div>
      )}

      {/* 2. The last card, explained */}
      {cur && <LastCard room={room} />}

      {/* 3. Picker, if it's my decision */}
      {iChoose && !g.vote && <Chooser key={g.drawnCount} room={room} token={token} hostToken={null} />}

      {/* 4. Things that affect me */}
      <AboutMe room={room} token={token} />

      {/* 5. Ongoing table stuff, tucked away */}
      <TableExtras room={room} hostToken={hostToken} />
    </div>
  );
}

function Banner({ children, tone }: { children: React.ReactNode; tone: "hit" | "ink" }) {
  return (
    <div className={`pop rounded-2xl px-5 py-4 text-lg font-medium text-paper ${tone === "hit" ? "bg-hit" : "bg-ink"}`}>
      {children}
    </div>
  );
}

function Waiting({ room, id, text }: { room: RoomView; id: string | null; text: string }) {
  const p = playerOf(room, id);
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-ink/5 px-4 py-3">
      {p && <Avatar player={p} size={44} />}
      <p className="text-lg">
        <strong className="font-hand text-3xl">{p?.name ?? "Someone"}</strong> {text}
      </p>
    </div>
  );
}

function LastCard({ room }: { room: RoomView }) {
  const g = game(room);
  const cur = g.current!;
  const rule = RULES[cur.card.rank];
  const fourthKing = cur.card.rank === "K" && g.kings >= 4 && !cur.pending;
  return (
    <div key={g.drawnCount} className="pop rounded-2xl border border-ink/15 bg-surface p-4">
      <div className="flex gap-4">
        <PlayingCard card={cur.card} />
        <div className="min-w-0">
          <p className="text-sm text-faint">{cur.by === room.me ? "You drew" : `${nameOf(room, cur.by)} drew`}</p>
          <h2 className={`font-hand text-4xl font-bold leading-none ${fourthKing ? "text-miss" : ""}`}>
            {fourthKing ? "King's cup!" : rule.name}
          </h2>
          <p className="mt-1">{fourthKing ? "Fourth King — drink the whole cup." : rule.text}</p>
        </div>
      </div>
      {cur.outcome && <p className="mt-3 rounded-md bg-ink px-3 py-2 text-center font-medium text-paper">{cur.outcome}</p>}
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-faint">How this card works</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {rule.how.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        {rule.example && <p className="mt-2 text-faint">Example: {rule.example}</p>}
      </details>
    </div>
  );
}

/** Only shows when something applies to me: mates, question master. */
function AboutMe({ room, token }: { room: RoomView; token: string | null }) {
  const g = game(room);
  const me = room.me;
  const myMates = g.mates.filter(([a]) => a === me).map(([, b]) => nameOf(room, b));
  const iFollow = g.mates.filter(([, b]) => b === me).map(([a]) => nameOf(room, a));
  const isQm = g.questionMaster === me;
  if (!myMates.length && !iFollow.length && !isQm) return null;

  return (
    <div className="space-y-3 rounded-2xl bg-ink/5 p-4">
      <h3 className="text-sm font-medium text-faint">About you</h3>
      {iFollow.length > 0 && (
        <p>
          When <strong>{iFollow.join(" or ")}</strong> drinks, you drink too.
        </p>
      )}
      {myMates.length > 0 && (
        <p>
          When you drink, <strong>{myMates.join(" and ")}</strong> drink{myMates.length === 1 ? "s" : ""} too.
        </p>
      )}
      {isQm && (
        <div>
          <p>
            <strong>You&rsquo;re question master.</strong> If someone answers your question, tap them:
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {room.players
              .filter((p) => p.id !== me)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => act(room, token, null, { type: "penalty", playerId: p.id })}
                  className="flex items-center gap-1.5 rounded-full border-2 border-ink/20 bg-surface py-1 pl-1 pr-3 hover:border-miss"
                >
                  <Avatar player={p} size={24} /> {p.name}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TableExtras({ room, hostToken }: { room: RoomView; hostToken: string | null }) {
  const g = game(room);
  const bits = [
    `${g.left} cards left`,
    g.kingsOn ? `${g.kings}/4 Kings` : null,
    g.questionMaster && g.questionMaster !== room.me ? `Question master: ${nameOf(room, g.questionMaster)}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-2 text-sm text-faint">
      <p>{bits.join(" · ")}</p>
      {g.mates.length > 0 && (
        <details>
          <summary className="cursor-pointer">Drinking partners ({g.mates.length})</summary>
          <ul className="mt-2 space-y-1 text-ink">
            {g.mates.map(([a, b]) => (
              <li key={a + b}>
                When <strong>{nameOf(room, a)}</strong> drinks, <strong>{nameOf(room, b)}</strong> drinks
              </li>
            ))}
          </ul>
        </details>
      )}
      {g.rules.length > 0 && (
        <details>
          <summary className="cursor-pointer">Rules everyone must follow ({g.rules.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">
            {g.rules.map((r) => (
              <li key={r.id}>
                {r.text}
                {room.isHost && <RemoveRule room={room} hostToken={hostToken} id={r.id} />}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
