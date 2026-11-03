import type { Card } from "@/lib/cards";

const SIZES = {
  sm: { box: "h-[4.5rem] w-12 rounded-md", corner: "text-[10px] left-1 top-0.5", cornerB: "text-[10px] bottom-0.5 right-1", center: "text-2xl" },
  md: { box: "h-28 w-20 rounded-lg", corner: "text-sm left-1.5 top-1", cornerB: "text-sm bottom-1 right-1.5", center: "text-4xl" },
  lg: { box: "h-64 w-44 rounded-2xl", corner: "text-2xl left-3 top-2", cornerB: "text-2xl bottom-2 right-3", center: "text-8xl" },
};

export function PlayingCard({
  card,
  hidden = false,
  size = "md",
}: {
  card: Card;
  hidden?: boolean;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  if (hidden) {
    return (
      <div
        className={`${s.box} border-2 border-white/30 bg-card-back bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgb(255_255_255/0.14)_6px_8px)] shadow-md ring-1 ring-black/20`}
      />
    );
  }
  // real card colours whatever the theme
  const color = card.suit.red ? "text-[#c62d2d]" : "text-[#1b1b22]";
  return (
    <div
      className={`relative flex ${s.box} shrink-0 items-center justify-center border border-black/15 bg-[#fdfcf8] shadow-md ring-1 ring-black/5 ${color}`}
      aria-label={`${card.rank}${card.suit.symbol}`}
    >
      <span className={`absolute ${s.corner} font-bold leading-tight`}>
        {card.rank}
        <br />
        {card.suit.symbol}
      </span>
      <span className={s.center}>{card.suit.symbol}</span>
      <span className={`absolute ${s.cornerB} rotate-180 font-bold leading-tight`}>
        {card.rank}
        <br />
        {card.suit.symbol}
      </span>
    </div>
  );
}
