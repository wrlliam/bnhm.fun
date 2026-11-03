type Part = { key: string; len: number; el: (p: { className: string; style: React.CSSProperties }) => React.ReactNode };

// Stickman parts in the order they appear, one per wrong guess.
const PARTS: Part[] = [
  { key: "head", len: 95, el: (p) => <circle cx="150" cy="70" r="15" {...p} /> },
  { key: "body", len: 60, el: (p) => <line x1="150" y1="85" x2="150" y2="145" {...p} /> },
  { key: "armL", len: 45, el: (p) => <line x1="150" y1="100" x2="122" y2="128" {...p} /> },
  { key: "armR", len: 45, el: (p) => <line x1="150" y1="100" x2="178" y2="128" {...p} /> },
  { key: "legL", len: 50, el: (p) => <line x1="150" y1="145" x2="126" y2="185" {...p} /> },
  { key: "legR", len: 50, el: (p) => <line x1="150" y1="145" x2="174" y2="185" {...p} /> },
];

export function Stickman({ wrong, lost }: { wrong: number; lost: boolean }) {
  return (
    <svg viewBox="0 0 220 240" className="w-full max-w-[260px]" aria-label={`${wrong} of 6 parts drawn`}>
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink"
      >
        {/* gallows */}
        <path d="M20 225 H120" />
        <path d="M50 225 V20 H150 V55" />
        <path d="M50 50 L80 20" />
      </g>
      <g
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className={lost ? "stroke-miss" : "stroke-ink"}
      >
        {PARTS.slice(0, wrong).map((part) =>
          <g key={part.key}>
            {part.el({ className: "draw", style: { ["--len" as string]: part.len } })}
          </g>,
        )}
        {lost && (
          <g className="pop" strokeWidth="2.5">
            <path d="M142 64 l5 5 m0 -5 l-5 5" />
            <path d="M153 64 l5 5 m0 -5 l-5 5" />
          </g>
        )}
      </g>
    </svg>
  );
}
