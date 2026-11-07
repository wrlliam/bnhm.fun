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
  /** Snow and Santa hats in December, bats and witch hats the week of Halloween. */
  seasonal: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  textSize: "normal",
  keepAwake: true,
  vibrate: true,
  sound: true,
  motion: true,
  wording: "drink",
  seasonal: true,
};

export type Season = "halloween" | "christmas";
export const SEASONS: Season[] = ["halloween", "christmas"];
/** Per-tab preview, set by visiting any page with ?season=christmas (or halloween, or none). */
export const SEASON_PREVIEW_KEY = "season-preview";

/** The week up to Halloween (25–31 October) and all of December. Everything else: none. */
export function seasonFor(d: Date): Season | null {
  const m = d.getMonth();
  const day = d.getDate();
  if (m === 9 && day >= 25) return "halloween";
  if (m === 11) return "christmas";
  return null;
}

export const SETTINGS_KEY = "settings";

/** Runs in <head> before paint, alongside the theme script. */
export const SETTINGS_SCRIPT = `try{var s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}"),d=document.documentElement;if(s.textSize)d.dataset.text=s.textSize;if(s.motion===false)d.dataset.motion="off";var q=new URLSearchParams(location.search).get("season");if(q)sessionStorage.setItem("${SEASON_PREVIEW_KEY}",q);var p=sessionStorage.getItem("${SEASON_PREVIEW_KEY}"),n=new Date(),m=n.getMonth(),t=m===9&&n.getDate()>=25?"halloween":m===11?"christmas":"";if(p)t=${JSON.stringify(SEASONS)}.indexOf(p)>-1?p:"";if(t&&s.seasonal!==false)d.dataset.season=t}catch(e){}`;

/** Wording for alerts, following the "drink / forfeit" setting. */
export function alertWords(wording: Settings["wording"]) {
  return wording === "forfeit"
    ? { shout: "Forfeit!", done: "Done — forfeit done", verb: "do their forfeit", amount: (n: number) => (n === 0 ? "The big forfeit" : `${n} ${n === 1 ? "point" : "points"}`) }
    : { shout: "Drink!", done: "Done — I drank", verb: "drink", amount: (n: number) => (n === 0 ? "The whole King's cup" : `${n} ${n === 1 ? "sip" : "sips"}`) };
}
