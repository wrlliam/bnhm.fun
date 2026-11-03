import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "bnhm.fun",
    short_name: "bnhm.fun",
    description: "Party games for everyone's phone: Ring of Fire, Most Likely To, Hangman and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3e8",
    theme_color: "#1f2a44",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
