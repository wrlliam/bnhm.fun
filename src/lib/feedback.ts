"use client";

import { getSettings } from "./settings";

let ctx: AudioContext | null = null;

/** Short synthesized tones (no audio files). Silently does nothing if audio is blocked. */
export function playSound(kind: "drink" | "turn") {
  if (!getSettings().sound) return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const notes = kind === "drink" ? [660, 440] : [523, 784];
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      const t = ctx!.currentTime + i * 0.14;
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.2);
    });
  } catch {}
}

export function buzz(pattern: number | number[]) {
  if (getSettings().vibrate) navigator.vibrate?.(pattern);
}
