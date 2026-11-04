import Link from "next/link";
import { SiteNav } from "@/components/site-nav";

const GAMES = [
  {
    href: "/party/ring-of-fire",
    name: "Ring of Fire",
    blurb: "Draw a card, follow its rule. Fourth King drinks the cup.",
    suit: "♥",
  },
  {
    href: "/party/higher-lower",
    name: "Higher or Lower",
    blurb: "Call the next card. Miss, and drink for your whole streak.",
    suit: "♠",
  },
  {
    href: "/party/ride-the-bus",
    name: "Ride the Bus",
    blurb: "Four right calls in a row to get off. Miss, drink, start again.",
    suit: "♣",
  },
  {
    href: "/party/pyramid",
    name: "Pyramid",
    blurb: "Memorise your hand, flip the pyramid, hand out drinks for matches.",
    suit: "♦",
  },
  {
    href: "/party/beat-the-dealer",
    name: "Beat the Dealer",
    blurb: "Guess the dealer's card in two tries. Miss and drink the gap.",
    suit: "♣",
  },
  {
    href: "/party/horse-race",
    name: "Horse Race",
    blurb: "Bet sips on an Ace. The deck decides who wins the race.",
    suit: "♥",
  },
  {
    href: "/party/never-have-i-ever",
    name: "Never Have I Ever",
    blurb: "Read the card. If you've done it, you drink.",
    suit: "♥",
  },
  {
    href: "/party/most-likely-to",
    name: "Most Likely To",
    blurb: "Everyone points on three. Sip for every finger at you.",
    suit: "♠",
  },
  {
    href: "/party/truth-or-drink",
    name: "Truth or Drink",
    blurb: "Answer the question honestly, or drink and dodge it.",
    suit: "♦",
  },
  {
    href: "/party/would-you-rather",
    name: "Would You Rather",
    blurb: "Everyone picks a side on three. The smaller side drinks.",
    suit: "♣",
  },
  {
    href: "/cards",
    name: "Deal hands",
    blurb: "Shuffle and deal hands to everyone, with a private link each.",
    suit: "♦",
  },
];

export default function PartyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:pl-20">
      <SiteNav />
      <header className="flex items-end justify-between gap-4">
        <h1 className="font-hand text-5xl font-bold">Party cards</h1>
      </header>
      <p className="mt-2 text-faint">One phone, one deck. Every game has a link so others can follow along.</p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3">
        {GAMES.map((g) => (
          <li key={g.href}>
            <Link
              href={g.href}
              className="group flex flex-col rounded-xl border-2 border-ink bg-surface p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className={`text-4xl ${g.suit === "♥" || g.suit === "♦" ? "text-miss" : ""}`}>{g.suit}</span>
              <span className="mt-4 font-hand text-3xl font-bold">{g.name}</span>
              <span className="mt-1 flex-1 text-sm text-faint">{g.blurb}</span>
            </Link>
            <Link
              href={`/how-to-play/${g.href === "/cards" ? "card-dealer" : g.href.split("/").pop()}`}
              className="mt-1 block text-center text-xs text-faint underline underline-offset-4 hover:text-ink"
            >
              How to play
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-16 text-xs text-faint">
        Over 18s only where drinking is involved. Swap drinks for water or forfeits anytime.
      </p>
    </main>
  );
}
