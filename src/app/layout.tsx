import type { Metadata, Viewport } from "next";
import { Baloo_2, Caveat, Fredoka, Geist, Geist_Mono, Gochi_Hand, Pacifico, Playfair_Display, VT323 } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { ThemePicker } from "@/components/theme-picker";
import { THEME_SCRIPT } from "@/lib/themes";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "700"] });
// Theme-only fonts: not preloaded, so they only download when that theme is picked.
// (next/font needs literal options here — no shared object spread.)
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"], preload: false });
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["700", "800"], preload: false });
const gochi = Gochi_Hand({ variable: "--font-gochi", subsets: ["latin"], weight: "400", preload: false });
const vt323 = VT323({ variable: "--font-vt323", subsets: ["latin"], weight: "400", preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: "400", preload: false });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500", "700", "800"], preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://bnhm.fun";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "bnhm.fun: party games for everyone's phone", template: "%s · bnhm.fun" },
  description: BRAND.description,
  applicationName: "bnhm.fun",
  openGraph: { siteName: "bnhm.fun", type: "website", url: "/" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { title: "bnhm.fun", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3e8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0a1f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [geistSans, caveat, fredoka, playfair, gochi, vt323, pacifico, baloo, geistMono]
    .map((f) => f.variable)
    .join(" ");
  return (
    // data-theme is set before first paint by THEME_SCRIPT, so React must not complain about it
    <html lang="en" data-theme="notebook" suppressHydrationWarning className={`${fonts} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <ThemePicker />
      </body>
    </html>
  );
}
