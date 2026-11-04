import type { Metadata } from "next";
import { guideBySlug } from "./guides";

const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "bnhm.fun: party games for everyone's phone" };

/** Defaults every page's share tags should carry. */
export const SHARE = {
  openGraph: { type: "website" as const, siteName: "bnhm.fun", locale: "en_GB", images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image" as const, images: [SHARE_IMAGE.url] },
};

/** Metadata for a page about one game, built from its how-to-play guide. */
export function gameMetadata(slug: string, opts: { path: string; prefix?: string } ): Metadata {
  const g = guideBySlug(slug);
  if (!g) return {};
  const title = opts.prefix ? `${opts.prefix} ${g.name}` : g.name;
  const description = `${g.tagline} ${g.overview}`.slice(0, 300);
  return {
    title,
    description,
    keywords: [g.name.toLowerCase(), `${g.name.toLowerCase()} rules`, `how to play ${g.name.toLowerCase()}`, "party game"],
    alternates: { canonical: opts.path },
    // a page-level openGraph/twitter object replaces the parent's, so restate image + card here
    openGraph: { ...SHARE.openGraph, title: `${title} · bnhm.fun`, description, url: opts.path },
    twitter: { ...SHARE.twitter, title: `${title} · bnhm.fun`, description },
  };
}

/** Private, short-lived pages (rooms, TV screens): keep them out of search results. */
export const PRIVATE: Metadata["robots"] = { index: false, follow: false };
