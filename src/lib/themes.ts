export const THEMES = [
  { id: "notebook", name: "Notebook", hint: "Ruled paper, handwriting", dark: false },
  { id: "clean", name: "Clean", hint: "Minimal and crisp", dark: false },
  { id: "sunset", name: "Sunset", hint: "Warm peach and coral", dark: false },
  { id: "candy", name: "Candy", hint: "Pastel, soft and bouncy", dark: false },
  { id: "night", name: "Night", hint: "Neon party lights", dark: true },
  { id: "casino", name: "Casino", hint: "Green felt and gold", dark: true },
  { id: "chalkboard", name: "Chalkboard", hint: "Chalk on a board", dark: true },
  { id: "ocean", name: "Ocean", hint: "Deep blue and teal", dark: true },
  { id: "arcade", name: "Arcade", hint: "Pixels and scanlines", dark: true },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_KEY = "theme";

/** Runs in <head> before paint so there's no flash of the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t&&${JSON.stringify(
  THEMES.map((t) => t.id),
)}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}`;
