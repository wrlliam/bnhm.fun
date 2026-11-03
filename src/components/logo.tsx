import Link from "next/link";

export const BRAND = {
  name: "bnhm.fun",
  tagline: "Party games for everyone's phone",
  description:
    "Ring of Fire, Most Likely To, Hangman and more. Start a room, share the code, and everyone plays on their own phone, with an optional TV screen.",
};

/**
 * The bnhm.fun mark: two fanned playing cards. Uses theme colours (ink, surface,
 * miss) so it looks native in every theme.
 */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={className} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-ink" />
      <g transform="rotate(-14 32 36)">
        <rect x="15" y="14" width="26" height="36" rx="4" className="fill-surface" opacity="0.55" />
      </g>
      <g transform="rotate(9 32 36)">
        <rect x="22" y="12" width="27" height="38" rx="4" className="fill-surface" />
        <path
          d="M35.5 41c-6.5-4.4-8.2-8.3-6.4-10.9 1.6-2.3 4.8-2 6.4.4 1.6-2.4 4.8-2.7 6.4-.4 1.8 2.6.1 6.5-6.4 10.9z"
          className="fill-miss"
        />
      </g>
    </svg>
  );
}

/** Mark + "bnhm.fun" wordmark. */
export function Logo({
  size = 40,
  href = "/",
  className = "",
  textClass = "text-3xl",
}: {
  size?: number;
  href?: string | null;
  className?: string;
  textClass?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className={`font-hand font-bold leading-none tracking-tight ${textClass}`}>
        bnhm<span className="text-miss">.fun</span>
      </span>
    </span>
  );
  return href ? (
    <Link href={href} aria-label="bnhm.fun home">
      {inner}
    </Link>
  ) : (
    inner
  );
}
