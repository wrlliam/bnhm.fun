"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { THEME_KEY, THEMES, type ThemeId } from "@/lib/themes";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}

export function setTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {}
}

/**
 * Floating button (bottom-right) that opens a grid of live theme previews.
 * Each preview sets its own data-theme, so it renders with that theme's real
 * colours, fonts, corners and background — no hand-maintained swatches.
 */
export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const current = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.theme ?? "notebook",
    () => "notebook",
  );

  // close on Escape or a click outside
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !panel.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={panel} className="fixed bottom-4 right-4 z-[70] print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Choose a theme"
          className="pop absolute bottom-14 right-0 max-h-[75vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-2 border-ink/15 bg-surface p-3 shadow-2xl"
        >
          <p className="px-1 pb-2 text-xs font-medium text-faint">Theme on this device</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {THEMES.map((t) => (
              <button
                key={t.id}
                role="radio"
                aria-checked={current === t.id}
                onClick={() => setTheme(t.id)}
                className={`group rounded-xl p-0.5 text-left transition ${
                  current === t.id ? "ring-2 ring-hit ring-offset-2 ring-offset-surface" : "hover:-translate-y-0.5"
                }`}
              >
                <ThemePreview id={t.id} name={t.name} hint={t.hint} />
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Change theme"
        title="Change theme"
        className="flex size-11 items-center justify-center rounded-full border-2 border-ink/15 bg-surface text-ink shadow-lg transition hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.2-2.2 1-2.2H17a4 4 0 0 0 4-4c0-5-4-10-9-10Z" />
          <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
          <circle cx="10" cy="7" r="1.2" fill="currentColor" />
          <circle cx="15" cy="7.5" r="1.2" fill="currentColor" />
        </svg>
      </button>
    </div>
  );
}

/** A tiny page rendered in the given theme. */
function ThemePreview({ id, name, hint }: { id: ThemeId; name: string; hint: string }) {
  return (
    <div
      data-theme={id}
      className="overflow-hidden rounded-xl border border-black/10 p-2.5 text-ink"
      style={{
        backgroundColor: "var(--paper)",
        backgroundImage: "var(--bg)",
        backgroundSize: id === "arcade" ? "16px 16px" : id === "candy" ? "auto, auto, auto, 14px 14px" : undefined,
        fontFamily: "var(--body-font)",
      }}
    >
      <p className="font-hand text-2xl font-bold leading-none">{name}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <span className="rounded-md bg-ink px-2 py-0.5 text-[10px] font-medium text-paper">Play</span>
        <span className="size-3 rounded-full bg-hit" />
        <span className="size-3 rounded-full bg-miss" />
        <span className="ml-auto h-5 w-3.5 rounded-sm border border-white/30 bg-card-back" />
      </div>
      <p className="mt-1.5 truncate text-[10px] text-faint">{hint}</p>
    </div>
  );
}
