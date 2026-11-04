"use client";

import Link from "next/link";
import { useState } from "react";
import { SiteNav } from "@/components/site-nav";
import { useProfileName } from "@/lib/rooms/client";

/** Make a Six Tries puzzle from your own word and get a link to share. */
export default function NewSixTries() {
  const [word, setWord] = useState("");
  const savedName = useProfileName();
  const [typedBy, setBy] = useState<string | null>(null);
  const by = typedBy ?? savedName;
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = id && typeof window !== "undefined" ? `${location.origin}/solo/six-tries/${id}` : "";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />
      <Link href="/solo" className="text-sm text-faint hover:text-ink">
        ← Solo games
      </Link>
      <h1 className="mt-2 font-hand text-6xl font-bold">Make a Six Tries</h1>

      {!id ? (
        <form
          className="mt-6 space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const res = await fetch("/api/puzzles", { method: "POST", body: JSON.stringify({ word, by }) });
            const data = await res.json().catch(() => ({}));
            setBusy(false);
            if (!res.ok) return setError(data.error ?? "Couldn't make the puzzle");
            setId(data.id);
          }}
        >
          <div>
            <label htmlFor="w" className="font-medium">
              Your secret word
            </label>
            <p className="text-sm text-faint">4 to 7 letters. Nobody sees it until they&rsquo;ve finished.</p>
            <div className="mt-2 flex items-center gap-2 border-b-2 border-ink">
              <input
                id="w"
                autoFocus
                type={show ? "text" : "password"}
                value={word}
                maxLength={7}
                onChange={(e) => setWord(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())}
                autoComplete="off"
                className="w-0 flex-1 bg-transparent py-2 font-mono text-4xl tracking-[0.3em] outline-none"
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="text-sm text-faint">
                {show ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="by" className="font-medium">
              Your name
            </label>
            <input
              id="by"
              value={by}
              maxLength={20}
              onChange={(e) => setBy(e.target.value)}
              className="mt-1 w-full border-b-2 border-ink/30 bg-transparent py-2 font-hand text-3xl outline-none focus:border-ink"
            />
          </div>
          <button
            disabled={busy || word.length < 4}
            className="rounded-xl bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
          >
            {busy ? "Making…" : "Make the puzzle"}
          </button>
          {error && <p className="text-sm text-miss">{error}</p>}
        </form>
      ) : (
        <div className="pop mt-6 space-y-5">
          <p className="text-lg">Your puzzle is ready. Send this link to friends:</p>
          <div className="flex gap-2">
            <input readOnly value={url} className="w-0 flex-1 rounded-xl border border-ink/20 bg-surface px-3 py-3 font-mono text-sm" onFocus={(e) => e.target.select()} />
            <button
              onClick={async () => {
                if (navigator.share) await navigator.share({ title: "Six Tries", text: `Can you guess my ${word.length}-letter word?`, url }).catch(() => {});
                else {
                  await navigator.clipboard?.writeText(url);
                  setCopied(true);
                }
              }}
              className="rounded-xl bg-ink px-5 font-medium text-paper"
            >
              {copied ? "Copied" : "Share"}
            </button>
          </div>
          <p className="text-sm text-faint">
            Open the same link any time to see everyone&rsquo;s results. Bookmark it, since this page won&rsquo;t remember it.
          </p>
          <Link href={`/solo/six-tries/${id}`} className="inline-block underline underline-offset-4">
            See the results board
          </Link>
        </div>
      )}
    </main>
  );
}
