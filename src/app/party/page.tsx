import Link from "next/link";
import { Emblem } from "@/components/emblem";
import { SiteNav } from "@/components/site-nav";
import { gameMeta, type Suit } from "@/lib/catalog";

type Item = { slug: string; href: string; name: string; blurb: string; emblem?: { rank: string; suit: Suit } };

/** Pass-the-phone games. Ones that also exist as room games reuse that game's emblem card. */
const SECTIONS: { title: string; hint: string; items: Item[] }[] = [
  {
    title: "Card games",
    hint: "One shuffled deck on one phone",
    items: [
      { slug: "ring-of-fire", href: "/party/ring-of-fire", name: "Ring of Fire", blurb: "Draw a card and follow its rule; the fourth King drinks the cup" },
      { slug: "higher-lower", href: "/party/higher-lower", name: "Higher or Lower", blurb: "Call the next card; miss and drink your whole streak" },
      { slug: "ride-the-bus", href: "/party/ride-the-bus", name: "Ride the Bus", blurb: "Four right calls in a row to get off; miss and start again", emblem: { rank: "4", suit: "♣" } },
      { slug: "pyramid", href: "/party/pyramid", name: "Pyramid", blurb: "Memorise your hand, flip the pyramid, hand out drinks for matches", emblem: { rank: "3", suit: "♦" } },
      { slug: "beat-the-dealer", href: "/party/beat-the-dealer", name: "Beat the Dealer", blurb: "Guess the dealer's card in two tries; miss and drink the gap", emblem: { rank: "6", suit: "♠" } },
      { slug: "horse-race", href: "/party/horse-race", name: "Horse Race", blurb: "Bet sips on an Ace and let the deck run the race", emblem: { rank: "A", suit: "♥" } },
    ],
  },
  {
    title: "Prompt games",
    hint: "Read the card out and pass the phone on",
    items: [
      { slug: "never-have-i-ever", href: "/party/never-have-i-ever", name: "Never Have I Ever", blurb: "Read the card; if you've done it, you drink" },
      { slug: "most-likely-to", href: "/party/most-likely-to", name: "Most Likely To", blurb: "Everyone points on three; a sip for every finger at you" },
      { slug: "truth-or-drink", href: "/party/truth-or-drink", name: "Truth or Drink", blurb: "Answer honestly, or drink and dodge it" },
      { slug: "would-you-rather", href: "/party/would-you-rather", name: "Would You Rather", blurb: "Everyone picks a side on three; the smaller side drinks", emblem: { rank: "5", suit: "♦" } },
    ],
  },
  {
    title: "Card dealer",
    hint: "For any card game you already know",
    items: [{ slug: "card-dealer", href: "/cards", name: "Deal hands", blurb: "Shuffle and deal a hand to everyone, with a private link each", emblem: { rank: "J", suit: "♠" } }],
  },
];

export default function PartyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6 sm:pl-20">
      <SiteNav />
      <h1 className="font-hand text-6xl font-bold leading-none">One phone</h1>
      <p className="mt-3 max-w-xl text-lg">Pass one phone round the table. Every game has a link, so others can follow along on theirs</p>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mt-12">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-hand text-4xl font-bold">{section.title}</h2>
            <p className="hidden text-sm text-faint sm:block">{section.hint}</p>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {section.items.map((g) => {
              const emblem = g.emblem ?? gameMeta(g.slug)?.emblem ?? { rank: "A", suit: "♠" as Suit };
              return (
                <li key={g.href} className="group relative flex items-center gap-4 rounded-2xl border border-ink/10 bg-surface p-4 transition-colors hover:border-ink/30">
                  <Emblem rank={emblem.rank} suit={emblem.suit} />
                  <div className="min-w-0 flex-1">
                    {/* the whole card opens the game; the rules link sits above it */}
                    <Link href={g.href} className="font-hand text-3xl font-bold leading-none after:absolute after:inset-0 after:rounded-2xl">
                      {g.name}
                    </Link>
                    <p className="mt-1 text-sm text-faint">{g.blurb}</p>
                    <Link
                      href={`/how-to-play/${g.slug}`}
                      className="relative z-10 mt-1 inline-block text-xs text-faint underline underline-offset-4 transition-colors hover:text-ink"
                    >
                      How to play
                    </Link>
                  </div>
                  <span className="text-faint transition-colors group-hover:text-ink" aria-hidden>
                    →
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <p className="mt-16 text-xs text-faint">Over 18s only where drinking is involved. Swap drinks for water or forfeits anytime</p>
    </main>
  );
}
