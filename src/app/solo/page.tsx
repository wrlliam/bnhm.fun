import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { MINI_PUZZLES } from "@/lib/minigrid";
import { SHARE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Solo games: Six Tries word puzzles and Mini Grid crosswords",
  description: "Make a word puzzle from your own word and share the link to see everyone's results, or solve a quick mini crossword.",
  alternates: { canonical: "/solo" },
  openGraph: { ...SHARE.openGraph, url: "/solo" },
  twitter: SHARE.twitter,
};

export default function SoloPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />
      <h1 className="font-hand text-6xl font-bold">Play on your own</h1>
      <p className="mt-2 text-faint">Quick puzzles for the bus, or to send to the group chat.</p>

      <section className="mt-10 grid gap-6 md:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-ink/10 bg-surface p-6">
          <div className="flex gap-1.5" aria-hidden>
            {["g", "y", "x", "g", "g"].map((c, i) => (
              <span
                key={i}
                className={`size-9 rounded-md ${c === "g" ? "bg-[#4a9d5b]" : c === "y" ? "bg-[#d4a72c]" : "bg-[#9aa0a8]"}`}
              />
            ))}
          </div>
          <h2 className="mt-4 font-hand text-4xl font-bold">Six Tries</h2>
          <p className="mt-1 text-sm text-faint">
            Pick a secret word, send the link, and see how everyone did. Six guesses to find it; colours show which letters are right.
          </p>
          <Link
            href="/solo/six-tries/new"
            className="mt-5 inline-block rounded-xl bg-ink px-5 py-3 font-medium text-paper transition-colors hover:bg-ink/90"
          >
            Make a puzzle
          </Link>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-surface p-6">
          <div className="grid w-fit grid-cols-4 gap-0.5" aria-hidden>
            {"WINGIDEASLAMHERE".split("").map((c, i) => (
              <span key={i} className="flex size-7 items-center justify-center border border-ink/20 font-mono text-xs">
                {i % 5 === 0 ? c : ""}
              </span>
            ))}
          </div>
          <h2 className="mt-4 font-hand text-4xl font-bold">Mini Grid</h2>
          <p className="mt-1 text-sm text-faint">Tiny crosswords you can finish in a couple of minutes. How fast can you go?</p>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {MINI_PUZZLES.map((p) => (
              <Link
                key={p.id}
                href={`/solo/mini/${p.id}`}
                className="flex aspect-square items-center justify-center rounded-xl border border-ink/15 font-mono font-bold transition-colors hover:bg-ink hover:text-paper"
              >
                {p.id}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
