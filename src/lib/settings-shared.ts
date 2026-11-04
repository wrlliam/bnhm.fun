/** Settings constants shared by the server layout (pre-paint script) and client code. */

/** Per-device preferences. Stored in localStorage; nothing is sent to the server. */
export type Settings = {
  textSize: "normal" | "large" | "xl";
  /** Stop the screen sleeping while the app is open (great for the TV and the phone on the table). */
  keepAwake: boolean;
  vibrate: boolean;
  sound: boolean;
  /** Pop-ins, shakes and transitions. Off also respects the system "reduce motion" setting. */
  motion: boolean;
  /** Wording on alerts: "Drink!" or "Forfeit!" for groups that aren't drinking. */
  wording: "drink" | "forfeit";
};

export const DEFAULT_SETTINGS: Settings = {
  textSize: "normal",
  keepAwake: true,
  vibrate: true,
  sound: true,
  motion: true,
  wording: "drink",
};

export const SETTINGS_KEY = "settings";

/** Runs in <head> before paint, alongside the theme script. */
export const SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}"),d=document.documentElement;if(s.textSize)d.dataset.text=s.textSize;if(s.motion===false)d.dataset.motion="off"}catch(e){}`;

/** Wording for alerts, following the "drink / forfeit" setting. */
export function alertWords(wording: Settings["wording"]) {
  return wording === "forfeit"
    ? { shout: "Forfeit!", done: "Done — forfeit done", verb: "do their forfeit", amount: (n: number) => (n === 0 ? "The big forfeit" : `${n} ${n === 1 ? "point" : "points"}`) }
    : { shout: "Drink!", done: "Done — I drank", verb: "drink", amount: (n: number) => (n === 0 ? "The whole King's cup" : `${n} ${n === 1 ? "sip" : "sips"}`) };
}
