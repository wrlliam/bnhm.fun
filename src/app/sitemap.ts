import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/brand";
import { GAMES_CATALOG } from "@/lib/catalog";
import { GUIDES } from "@/lib/guides";
import { MINI_PUZZLES } from "@/lib/minigrid";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${SITE_URL}${path}`;
  const playable = GUIDES.flatMap((g) => g.modes.map((m) => m.href)).filter((h) => h !== "/" && !h.startsWith("/new/"));
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/how-to-play"), changeFrequency: "monthly", priority: 0.8 },
    ...GUIDES.map((g) => ({ url: url(`/how-to-play/${g.slug}`), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...GAMES_CATALOG.map((g) => ({ url: url(`/new/${g.kind}`), changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: url("/solo"), changeFrequency: "monthly", priority: 0.8 },
    { url: url("/solo/six-tries/new"), changeFrequency: "monthly", priority: 0.7 },
    ...MINI_PUZZLES.map((p) => ({ url: url(`/solo/mini/${p.id}`), changeFrequency: "yearly" as const, priority: 0.5 })),
    { url: url("/party"), changeFrequency: "monthly", priority: 0.8 },
    ...[...new Set(playable)].map((h) => ({ url: url(h), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
