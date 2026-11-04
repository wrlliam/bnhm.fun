"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type RoomView, roomAction, saveToken, type StreamStatus } from "@/lib/rooms/client";
import { AdminAccess } from "./admin-access";
import { GameSwitcher, WhatsNext } from "./game-switcher";
import { JoinQr } from "./join-qr";
import { ReactionBar } from "./reactions";
import { Recap } from "./recap";
import { Avatar } from "./avatar";
import { JoinForm } from "./join-form";
import { PlayerList } from "./player-list";

export function openTv(code: string) {
  window.open(`/tv/${code}`, `tv-${code}`, "popup,width=1280,height=760");
}

export function joinUrl(code: string) {
  return typeof window === "undefined" ? `/r/${code}` : `${location.origin}/r/${code}`;
}

/**
 * Phone layout for every room game: one simple column.
 * Everything that isn't "what do I do right now" lives in the Menu drawer.
 */
export function RoomShell({
  room,
  status,
  token,
  hostToken,
  children,
  menu,
}: {
  room: RoomView;
  status: StreamStatus;
  token: string;
  hostToken: string | null | undefined;
  children: React.ReactNode;
  /** Extra items for the menu drawer (e.g. host settings). */
  menu?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const me = room.players.find((p) => p.id === room.me);

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-5 sm:pl-20">
      <header className="flex items-center gap-3">
        {me && <Avatar player={me} size={36} />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-hand text-3xl font-bold leading-none">{room.title}</h1>
          <button
            onClick={async () => {
              await navigator.clipboard?.writeText(joinUrl(room.code));
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="text-xs text-faint"
          >
            {copied ? "Invite link copied" : <>Code <span className="font-mono font-bold text-ink">{room.code}</span> · tap to copy invite</>}
          </button>
        </div>
        {status !== "live" && (
          <span className="rounded-full bg-miss/10 px-2 py-0.5 text-xs text-miss">
            {status === "reconnecting" ? "Reconnecting…" : "Connecting…"}
          </span>
        )}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-md border-2 border-ink px-3 py-1.5 text-sm font-medium transition hover:bg-ink hover:text-paper"
        >
          {open ? "Close" : "Menu"}
        </button>
      </header>

      {open && (
        <div className="pop mt-4 space-y-6 rounded-xl border-2 border-ink bg-surface p-5">
          <div>
            <h2 className="text-sm font-medium text-faint">Players ({room.players.length})</h2>
            <div className="mt-2">
              <PlayerList
                room={room}
                size={32}
                onMakeHost={room.isHost ? (id) => act(room, token, hostToken, { type: "makeHost", playerId: id }) : undefined}
                onKick={room.isHost ? (id) => act(room, token, hostToken, { type: "kick", playerId: id }) : undefined}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <JoinQr code={room.code} size={96} />
            <p className="text-sm text-faint">
              Scan to join, or enter code <span className="font-mono font-bold text-ink">{room.code}</span>.
              {room.myPin && (
                <>
                  <br />
                  Your rejoin PIN: <span className="font-mono font-bold text-ink">{room.myPin}</span>, to get back in from
                  another phone.
                </>
              )}
            </p>
          </div>
          <details>
            <summary className="cursor-pointer text-sm font-medium">Game recap &amp; stats</summary>
            <div className="mt-3">
              <Recap room={room} />
              {room.isHost && (
                <button
                  onClick={() => act(room, token, hostToken, { type: "recap", show: !room.showRecap })}
                  className="mt-3 block text-sm font-medium underline underline-offset-4"
                >
                  {room.showRecap ? "Hide recap on the TV" : "Show recap on the TV"}
                </button>
              )}
            </div>
          </details>
          {menu}
          {room.isHost && (
            <details>
              <summary className="cursor-pointer text-sm font-medium">Switch game (everyone stays in)</summary>
              <div className="mt-3">
                <GameSwitcher room={room} compact />
              </div>
            </details>
          )}
          <AdminAccess room={room} hostToken={hostToken ?? null} />
          <div className="flex flex-col items-start gap-2 text-sm">
            {hostToken && (
              <button onClick={() => openTv(room.code)} className="font-medium underline underline-offset-4">
                Open TV / admin screen
              </button>
            )}
            <Link href={`/how-to-play/${room.kind}`} target="_blank" className="underline underline-offset-4">
              How to play {room.title}
            </Link>
            <button onClick={() => setEditing((e) => !e)} className="underline underline-offset-4">
              {editing ? "Cancel profile edit" : "Change my name / photo"}
            </button>
            {editing && (
              <JoinForm code={room.code} token={token} title="Your profile" submitLabel="Save" onDone={() => setEditing(false)} />
            )}
            <button
              onClick={async () => {
                if (!confirm("Leave this room?")) return;
                await roomAction(room.code, { type: "leave", token });
                saveToken(room.code, null);
                router.push("/");
              }}
              className="text-miss underline underline-offset-4"
            >
              Leave room
            </button>
          </div>
        </div>
      )}

      <section className="mt-6">{children}</section>

      {(room.game as { status?: string }).status === "finished" && (
        <div className="mt-8">
          <WhatsNext room={room} />
        </div>
      )}

      <div className="mt-10 border-t border-ink/10 pt-4">
        <ReactionBar room={room} />
      </div>
    </main>
  );
}

export function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">{children}</main>;
}

/** Big primary button used across games. */
export function BigButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md bg-ink px-6 py-3 font-medium text-paper transition hover:bg-ink/90 disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}

/** Hook-free helper: run an action, alert on error. */
export async function act(room: RoomView, token: string | null | undefined, hostToken: string | null | undefined, body: Record<string, unknown>) {
  const res = await roomAction(room.code, { token: token ?? undefined, hostToken: hostToken ?? undefined, ...body });
  if (!res.ok) alert(res.error);
  return res.ok;
}
