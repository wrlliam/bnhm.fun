"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { lastRoom, rememberRoom } from "@/lib/rooms/client";

const LINKS = [
  { href: "/", label: "Play", match: (p: string) => p === "/" || p.startsWith("/new") },
  { href: "/party", label: "One phone", match: (p: string) => p.startsWith("/party") || p.startsWith("/cards") },
  { href: "/how-to-play", label: "How to play", match: (p: string) => p.startsWith("/how-to-play") },
];

/** Top navigation for every page outside a room. The active tab needs the URL, so it streams in. */
export function SiteNav() {
  return (
    <Suspense fallback={<Nav path={null} />}>
      <NavWithPath />
    </Suspense>
  );
}

function NavWithPath() {
  return <Nav path={usePathname()} />;
}

function Nav({ path }: { path: string | null }) {
  return (
    <>
      <BackToRoom path={path} />
      <nav aria-label="Main" className="mb-8 flex items-center gap-1 overflow-x-auto text-sm">
        {LINKS.map((l) => {
          const on = path !== null && l.match(path);
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
    </>
  );
}

/** "Back to ABCD" when this device is still in a live room, so browsing the site doesn't strand you. */
function BackToRoom({ path }: { path: string | null }) {
  const [code, setCode] = useState<string | null>(null);
  // re-checked on every navigation: pages stay mounted in the background, and you may have left since
  useEffect(() => {
    const c = lastRoom();
    let live = true;
    if (!c) {
      queueMicrotask(() => live && setCode(null));
    } else {
      fetch(`/api/rooms/${c}`)
        .then((r) => {
          if (!live) return;
          setCode(r.ok ? c : null);
          if (r.status === 404) rememberRoom(null);
        })
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, [path]);
  if (!code) return null;
  return (
    <Link
      href={`/r/${code}`}
      className="pop mb-4 flex items-center justify-between gap-3 rounded-lg bg-hit/10 px-3 py-2 text-sm text-hit transition-colors hover:bg-hit/15"
    >
      <span>
        You&rsquo;re still in room <span className="font-mono font-medium">{code}</span>
      </span>
      <span className="font-medium">Back to room</span>
    </Link>
  );
}
