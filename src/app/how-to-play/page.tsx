import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = { title: "How to play" };

export default function HowToPlayIndex() {
  const room = GUIDES.filter((g) => g.modes.some((m) => m.room));
  const phone = GUIDES.filter((g) => !g.modes.some((m) => m.room));
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10 sm:pl-20">
      <Link href="/" className="text-xs text-faint hover:text-ink">
        ← Home
      </Link>
      <h1 className="font-hand text-6xl font-bold">How to play</h1>
      <p className="mt-2 text-faint">Rules and setup for every game.</p>

      <Section title="Everyone on their own phone" note="Join with a code. Optional TV / admin screen." guides={room} />
      <Section title="Pass one phone round" note="One device on the table." guides={phone} />
    </main>
  );
}

function Section({ title, note, guides }: { title: string; note: string; guides: typeof GUIDES }) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-xs text-faint">{note}</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              href={`/how-to-play/${g.slug}`}
              className="block h-full rounded-xl border-2 border-ink bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="font-hand text-3xl font-bold">{g.name}</span>
              <span className="mt-1 block text-sm text-faint">{g.tagline}</span>
              <span className="mt-2 block text-xs text-faint">
                {g.players} players · {g.time}
                {g.drinking && " · drinking game"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
