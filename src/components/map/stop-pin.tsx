import { CheckIcon } from "@/components/icons";

export type PinState = "todo" | "current" | "done" | "skipped";

/**
 * The numbered stop marker. Same look as the pins on the route map, so a stop's number
 * reads the same in every list, on the phone, the TV and the results.
 */
export function StopPin({ n, state = "todo", size = 28, tick = false }: { n: number; state?: PinState; size?: number; tick?: boolean }) {
  const look = {
    todo: "bg-ink text-paper",
    current: "bg-hit text-white ring-4 ring-hit/30",
    done: "bg-hit text-white",
    skipped: "bg-faint/40 text-paper",
  }[state];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-mono font-medium tabular-nums ${look}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {tick && state === "done" ? <CheckIcon size={Math.round(size * 0.55)} /> : n}
    </span>
  );
}
