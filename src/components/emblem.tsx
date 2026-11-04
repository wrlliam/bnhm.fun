import type { Suit } from "@/lib/catalog";

/** A game's emblem: a small playing card with its rank and suit (the app's signature detail). */
export function Emblem({
  rank,
  suit,
  size = "md",
  tilt = 0,
  className = "",
}: {
  rank: string;
  suit: Suit;
  size?: "sm" | "md" | "lg";
  tilt?: number;
  className?: string;
}) {
  const red = suit === "♥" || suit === "♦";
  const dims = { sm: "h-10 w-7 text-[10px]", md: "h-16 w-11 text-xs", lg: "h-32 w-22 text-xl" }[size];
  const center = { sm: "text-base", md: "text-2xl", lg: "text-6xl" }[size];
  return (
    <span
      aria-hidden
      style={{ transform: tilt ? `rotate(${tilt}deg)` : undefined }}
      className={`relative inline-flex shrink-0 items-center justify-center rounded-md border border-black/15 bg-[#fdfcf8] font-bold shadow-sm ${dims} ${
        red ? "text-[#c62d2d]" : "text-[#1b1b22]"
      } ${className}`}
    >
      <span className="absolute left-1 top-0.5 leading-none">
        {rank}
        <br />
        {suit}
      </span>
      <span className={center}>{suit}</span>
    </span>
  );
}
