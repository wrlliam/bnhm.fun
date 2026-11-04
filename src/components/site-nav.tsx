"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Play", match: (p: string) => p === "/" || p.startsWith("/new") },
  { href: "/solo", label: "Solo", match: (p: string) => p.startsWith("/solo") },
  { href: "/party", label: "One phone", match: (p: string) => p.startsWith("/party") || p.startsWith("/cards") },
  { href: "/how-to-play", label: "How to play", match: (p: string) => p.startsWith("/how-to-play") },
];

/** Top navigation for every page outside a room. */
export function SiteNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="mb-8 flex items-center gap-1 overflow-x-auto text-sm">
      {LINKS.map((l) => {
        const on = l.match(path);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={`shrink-0 rounded-md px-3 py-1.5 font-medium transition-colors ${on ? "bg-ink text-paper" : "text-faint hover:bg-ink/5 hover:text-ink"}`}
          >
            {l.label}
          </Link>
        );
      })}
      <Link href="/tv" className="ml-auto shrink-0 rounded-md px-3 py-1.5 text-faint transition-colors hover:bg-ink/5 hover:text-ink">
        TV screen
      </Link>
    </nav>
  );
}
