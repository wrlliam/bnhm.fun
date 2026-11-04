import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "en-GB",
    categories: ["games", "entertainment", "social"],
    background_color: BRAND.colors.paper,
    theme_color: BRAND.colors.ink,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Join a room", url: "/", description: "Enter a 4-letter room code" },
      { name: "TV screen", url: "/tv", description: "Show a room on a big screen" },
      { name: "How to play", url: "/how-to-play", description: "Rules for every game" },
    ],
  };
}
