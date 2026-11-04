"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playSound } from "@/lib/feedback";
import { type Settings, updateSettings, useSettings } from "@/lib/settings";
import { THEME_KEY, THEMES, type ThemeId } from "@/lib/themes";

function subscribeTheme(cb: () => void) {
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
 * Floating ⚙ button (bottom-right) with this device's settings: theme (live
 * previews), text size, keep screen awake, vibration, sound, animations, and
 * drink/forfeit wording. All stored locally; nothing goes to the server.
 */
export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const settings = useSettings();
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme ?? "notebook",
    () => "notebook",
  );

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

  const set = (patch: Partial<Settings>) => updateSettings(patch);

  return (
    <div ref={panel} className="fixed bottom-4 right-4 z-[70] print:hidden">
      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="pop absolute bottom-14 right-0 max-h-[80vh] w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border-2 border-ink/15 bg-surface p-4 shadow-2xl"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Settings</h2>
            <span className="text-xs text-faint">saved on this device</span>
          </div>

          <Section title="Theme">
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Theme">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  role="radio"
                  aria-checked={theme === t.id}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-xl p-0.5 text-left transition ${
                    theme === t.id ? "ring-2 ring-hit ring-offset-2 ring-offset-surface" : "hover:ring-1 hover:ring-ink/20"
                  }`}
                >
                  <ThemePreview id={t.id} name={t.name} hint={t.hint} />
                </button>
              ))}
            </div>
          </Section>

          <Section title="Text size">
            <Segmented
              value={settings.textSize}
              onChange={(textSize) => set({ textSize })}
              options={[
                ["normal", "A", "Normal"],
                ["large", "A+", "Large"],
                ["xl", "A++", "Extra large"],
              ]}
            />
          </Section>

          <Section title="Alerts say">
            <Segmented
              value={settings.wording}
              onChange={(wording) => set({ wording })}
              options={[
                ["drink", "Drink!", "Drinking game wording"],
                ["forfeit", "Forfeit!", "Non-drinking wording: forfeits and points"],
              ]}
            />
          </Section>

          <Section title="This device">
            <Toggle
              label="Keep screen awake"
              hint="Stops the phone or TV sleeping mid-game"
              checked={settings.keepAwake}
              onChange={(keepAwake) => set({ keepAwake })}
            />
            <Toggle
              label="Vibrate"
              hint="Buzz when you have to drink or it's your turn"
              checked={settings.vibrate}
              onChange={(vibrate) => {
                set({ vibrate });
                if (vibrate) navigator.vibrate?.(120);
              }}
            />
            <Toggle
              label="Sounds"
              hint="A short chime for alerts and your turn"
              checked={settings.sound}
              onChange={(sound) => {
                set({ sound });
                if (sound) playSound("turn");
              }}
            />
            <Toggle
              label="Animations"
              hint="Card flips, pop-ins and shakes"
              checked={settings.motion}
              onChange={(motion) => set({ motion })}
            />
          </Section>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
        className="flex size-11 items-center justify-center rounded-full border-2 border-ink/15 bg-surface text-ink shadow-lg transition-colors hover:bg-ink/5"
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h3 className="mb-2 text-xs font-medium text-faint">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string, string][];
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-ink/5 p-1" role="radiogroup">
      {options.map(([v, label, title]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          title={title}
          onClick={() => onChange(v)}
          className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition ${
            value === v ? "bg-surface shadow-sm" : "text-faint hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-ink/5"
    >
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-faint">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-hit" : "bg-ink/20"}`}>
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-surface shadow transition-[left] ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
    </button>
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
