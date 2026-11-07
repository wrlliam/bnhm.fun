"use client";

import { SeasonHat } from "@/components/seasonal";
import type { PublicPlayer } from "@/lib/rooms/core";
import { useSeason } from "@/lib/settings";

const COLORS = ["#c2412d", "#2f7d4f", "#1f2a44", "#b7791f", "#6b46c1", "#0f766e", "#be185d", "#2563eb"];

function colorFor(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return COLORS[Math.abs(h) % COLORS.length];
}

/** A player's photo or initial. In season it wears a hat (see components/seasonal.tsx). */
export function Avatar(props: Parameters<typeof Face>[0]) {
  const season = useSeason();
  const size = props.size ?? 40;
  if (!season || size < 34) return <Face {...props} />;
  return (
    <span className="relative inline-flex shrink-0">
      <Face {...props} />
      <SeasonHat season={season} size={size} />
    </span>
  );
}

function Face({
  player,
  size = 40,
  ring,
  dim,
}: {
  player: Pick<PublicPlayer, "id" | "name" | "avatar">;
  size?: number;
  ring?: string;
  dim?: boolean;
}) {
  const cls = `shrink-0 rounded-full object-cover ${ring ? `ring-4 ${ring}` : ""} ${dim ? "opacity-40 grayscale" : ""}`;
  if (player.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={player.avatar} alt="" width={size} height={size} className={cls} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={`${cls} flex items-center justify-center font-bold text-white`}
      style={{ width: size, height: size, background: colorFor(player.id), fontSize: size * 0.42 }}
    >
      {player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}
