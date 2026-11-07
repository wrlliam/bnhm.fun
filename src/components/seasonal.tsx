"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { type Season, useSeason, useSettings } from "@/lib/settings";

/**
 * Site-wide seasonal touches, on by default and switched off in Settings:
 * - December: falling snow, Santa hats on players.
 * - 25–31 October: cobwebs in the corners, the odd bat, witch hats on players.
 * Never blocks a tap (pointer-events: none) and the moving parts stop when
 * animations are off or the system asks for reduced motion.
 */
export function SeasonalLayer() {
  const season = useSeason();
  const motion = useMotionAllowed();
  if (!season) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] overflow-hidden print:hidden">
      {season === "christmas" && motion && <Snow />}
      {season === "halloween" && (
        <>
          <Cobweb className="absolute -left-2 -top-2" />
          <Cobweb className="absolute -right-2 -top-2 -scale-x-100" />
          {motion && <Bats />}
        </>
      )}
    </div>
  );
}

const reduceQuery = "(prefers-reduced-motion: reduce)";
function useMotionAllowed() {
  const { motion } = useSettings();
  const reduced = useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(reduceQuery);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(reduceQuery).matches,
    () => true,
  );
  return motion && !reduced;
}

/** Soft flakes drifting down. One canvas, paused while the tab is hidden. */
function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    type Flake = { x: number; y: number; r: number; vy: number; drift: number; phase: number };
    let flakes: Flake[] = [];
    const make = (top = false): Flake => ({
      x: Math.random() * w,
      y: top ? -10 : Math.random() * h,
      r: 1.2 + Math.random() * 2.6,
      vy: 18 + Math.random() * 30,
      drift: 8 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
    });
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // fewer flakes on small screens
      const target = Math.round(Math.min(90, (w * h) / 14000));
      flakes = Array.from({ length: target }, () => make());
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.y += f.vy * dt;
        f.phase += dt * 0.8;
        if (f.y > h + 10) Object.assign(f, make(true));
        const x = f.x + Math.sin(f.phase) * f.drift;
        ctx.beginPath();
        ctx.arc(x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fill();
        // a faint edge so flakes still show on light paper
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = "rgba(31,42,68,0.18)";
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    start();
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", start);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 size-full" />;
}

function Cobweb({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`size-28 text-ink opacity-25 sm:size-40 ${className}`} fill="none" stroke="currentColor" strokeWidth="0.9">
      {/* spokes from the corner */}
      {[0, 18, 36, 54, 72, 90].map((a) => (
        <line key={a} x1="0" y1="0" x2={120 * Math.cos((a * Math.PI) / 180)} y2={120 * Math.sin((a * Math.PI) / 180)} />
      ))}
      {/* sagging rings between the spokes */}
      {[22, 42, 64, 88].map((r) => (
        <path
          key={r}
          d={[0, 18, 36, 54, 72]
            .map((a, i) => {
              const p = (deg: number) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
              const [x1, y1] = p(a);
              const [x2, y2] = p(a + 18);
              const [mx, my] = p(a + 9).map((v) => v * 0.86);
              return `${i ? "" : `M${x1.toFixed(1)},${y1.toFixed(1)} `}Q${mx.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
            })
            .join(" ")}
        />
      ))}
    </svg>
  );
}

/** Three bats crossing now and then, each on its own slow loop. */
function Bats() {
  return (
    <>
      {[
        { top: "14%", delay: "0s", dur: "19s", size: 34 },
        { top: "32%", delay: "7s", dur: "23s", size: 24 },
        { top: "9%", delay: "13s", dur: "27s", size: 28 },
      ].map((b, i) => (
        <span key={i} className="season-bat absolute -left-16 text-ink" style={{ top: b.top, animationDelay: b.delay, animationDuration: b.dur }}>
          <svg viewBox="0 0 64 32" width={b.size * 2} height={b.size} className="season-bat-wings" style={{ animationDelay: b.delay }}>
            <path
              fill="currentColor"
              d="M32 10c-1.6 0-2.6 1.2-3 2.4l-1.6-3.4-.4 4.6C21 9.6 12 6 2 8c5 2.4 7.6 6.4 8 11 2.6-2 6-2.4 8.4-.4 1.6-2.4 5-3.4 8-2.2 1.4 1.8 3.6 3 5.6 3s4.2-1.2 5.6-3c3-1.2 6.4-.2 8 2.2 2.4-2 5.8-1.6 8.4.4.4-4.6 3-8.6 8-11-10-2-19 1.6-25 5.6l-.4-4.6-1.6 3.4c-.4-1.2-1.4-2.4-3-2.4Z"
            />
          </svg>
        </span>
      ))}
    </>
  );
}

/** A hat perched on a player's avatar. Tiny avatars go without (it'd just be a smudge). */
export function SeasonHat({ season, size }: { season: Season; size: number }) {
  if (size < 34) return null;
  const w = size * 0.62;
  return (
    <svg
      aria-hidden
      viewBox="0 0 40 36"
      width={w}
      height={w * 0.9}
      className="pointer-events-none absolute"
      style={{ top: -w * 0.5, right: -w * 0.18, transform: "rotate(18deg)" }}
    >
      {season === "christmas" ? (
        <>
          <path d="M6 28C8 16 16 6 28 4c4-.6 7 1.2 8 4l-4 1c-6 1-10 8-12 19Z" fill="#c62d2d" />
          <rect x="3" y="26" width="30" height="7" rx="3.5" fill="#fdfcf8" stroke="rgba(0,0,0,.08)" />
          <circle cx="35" cy="8" r="4" fill="#fdfcf8" stroke="rgba(0,0,0,.08)" />
        </>
      ) : (
        <>
          <path d="M10 28 22 2l4 2-2 6 6 18Z" fill="#2a2235" />
          <path d="M11.4 25h17.2l.8 3H10.6Z" fill="#e07a1f" />
          <ellipse cx="20" cy="29" rx="18" ry="4.5" fill="#2a2235" />
        </>
      )}
    </svg>
  );
}
