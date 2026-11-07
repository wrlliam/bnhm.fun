"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Emblem } from "@/components/emblem";
import { SiteNav } from "@/components/site-nav";
import { defaultOptions, gameMeta } from "@/lib/catalog";
import { PlacesOption } from "./places-option";
import { createRoom } from "@/lib/rooms/client";

/** Pick a game → read the three steps → set options → start the room. */
export function NewRoom({ kind }: { kind: string }) {
  const router = useRouter();
  const meta = gameMeta(kind);
  const [opts, setOpts] = useState<Record<string, unknown>>(() => (meta ? defaultOptions(meta) : {}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!meta) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6 sm:pl-20">
        <SiteNav />
        <p className="font-hand text-4xl">No game called “{kind}”</p>
        <Link href="/" className="mt-4 inline-block underline underline-offset-4">
          Back to all games
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />
      <Link href="/" className="text-sm text-faint hover:text-ink">
        ← All games
      </Link>

      <div className="mt-4 flex items-start gap-5">
        <Emblem rank={meta.emblem.rank} suit={meta.emblem.suit} size="lg" tilt={-6} className="shadow-md" />
        <div className="min-w-0">
          <h1 className="font-hand text-6xl font-bold leading-none">{meta.name}</h1>
          <p className="mt-2 text-lg">{meta.tagline}</p>
          <p className="mt-1 font-mono text-sm text-faint">
            {meta.players} players · {meta.time}
          </p>
        </div>
      </div>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        {meta.steps.map((step, i) => (
          <li key={step} className="rounded-2xl bg-ink/5 p-4">
            <span className="font-hand text-3xl font-bold text-hit">{i + 1}</span>
            <p className="mt-1 text-sm">{step}</p>
          </li>
        ))}
      </ol>

      {meta.options && (
        <section className="mt-8 space-y-6">
          {meta.options.map((o) =>
            o.type === "places" ? (
              <PlacesOption key={o.key} label={o.label} hint={o.hint} onChange={(items) => setOpts((x) => ({ ...x, [o.key]: items }))} />
            ) : o.type === "choice" ? (
              <div key={o.key}>
                <p className="font-medium">{o.label}</p>
                {o.hint && <p className="text-sm text-faint">{o.hint}</p>}
                <div className={`mt-2 grid gap-2 ${o.choices.length > 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-flow-col auto-cols-fr"}`} role="radiogroup" aria-label={o.label}>
                  {o.choices.map((c) => {
                    const on = opts[o.key] === c.value;
                    return (
                      <button
                        key={c.value}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setOpts((x) => ({ ...x, [o.key]: c.value }))}
                        className={`rounded-xl border p-3 text-left transition-colors ${on ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/40"}`}
                      >
                        <span className="block text-sm font-medium">{c.label}</span>
                        {c.hint && <span className={`block text-xs ${on ? "text-paper/70" : "text-faint"}`}>{c.hint}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <label key={o.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-ink/15 p-3">
                <span>
                  <span className="block font-medium">{o.label}</span>
                  {o.hint && <span className="block text-sm text-faint">{o.hint}</span>}
                </span>
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--hit)]"
                  checked={!!opts[o.key]}
                  onChange={(e) => setOpts((x) => ({ ...x, [o.key]: e.target.checked }))}
                />
              </label>
            ),
          )}
        </section>
      )}

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              router.push(`/r/${await createRoom(meta.kind, opts)}`);
            } catch (e) {
              setError((e as Error).message);
              setBusy(false);
            }
          }}
          className="rounded-xl bg-ink px-8 py-4 text-lg font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-50"
        >
          {busy ? "Starting…" : "Start a room"}
        </button>
        <Link href={`/how-to-play/${meta.kind}`} className="text-sm underline underline-offset-4">
          Full rules
        </Link>
      </div>
      <p className="mt-3 text-sm text-faint">
        You&rsquo;ll be the host: share the code or QR, then open the TV screen if you have one. You can switch games later without anyone rejoining.
      </p>
      {error && <p className="pop mt-3 text-sm text-miss">{error}</p>}
    </main>
  );
}

