import type { Metadata, Viewport } from "next";
import { Baloo_2, Caveat, Fredoka, Geist, Geist_Mono, Gochi_Hand, Pacifico, VT323 } from "next/font/google";
import { BRAND, SITE_URL } from "@/lib/brand";
import { KeepAwake } from "@/components/keep-awake";
import { SettingsPanel } from "@/components/settings-panel";
import { SETTINGS_SCRIPT } from "@/lib/settings-shared";
import { THEME_SCRIPT } from "@/lib/themes";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "700"] });
// Theme-only fonts: not preloaded, so they only download when that theme is picked.
// (next/font needs literal options here — no shared object spread.)
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["latin"], weight: ["500", "600", "700"], preload: false });
const gochi = Gochi_Hand({ variable: "--font-gochi", subsets: ["latin"], weight: "400", preload: false });
const vt323 = VT323({ variable: "--font-vt323", subsets: ["latin"], weight: "400", preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: "400", preload: false });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["500", "700", "800"], preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND.title, template: "%s · bnhm.fun" },
  description: BRAND.description,
  applicationName: BRAND.name,
  keywords: BRAND.keywords,
  category: "games",
  creator: BRAND.name,
  publisher: BRAND.name,
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: BRAND.title,
    description: BRAND.description,
    url: "/",
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: BRAND.title, description: BRAND.description },
  appleWebApp: { title: BRAND.name, capable: true, statusBarStyle: "default" },
};

/** Structured data so search engines understand what the site is. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: BRAND.name,
      description: BRAND.description,
      inLanguage: "en-GB",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: BRAND.name,
      url: SITE_URL,
      applicationCategory: "GameApplication",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires JavaScript",
      description: BRAND.description,
      image: `${SITE_URL}/opengraph-image`,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
      featureList: [
        "Join a room with a 4-letter code",
        "Every player uses their own phone",
        "TV / admin screen",
        "Ring of Fire, Most Likely To, Hangman",
        "Pass-the-phone card games",
        "8 visual themes",
      ],
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: BRAND.colors.paper },
    { media: "(prefers-color-scheme: dark)", color: "#0e0a1f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [geistSans, caveat, fredoka, gochi, vt323, pacifico, baloo, geistMono]
    .map((f) => f.variable)
    .join(" ");
  return (
    // data-theme is set before first paint by THEME_SCRIPT, so React must not complain about it
    <html lang="en" data-theme="notebook" suppressHydrationWarning className={`${fonts} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT + SETTINGS_SCRIPT }} />
        <script
          type="application/ld+json"
          // static, trusted content; `<` escaped so it can't close the tag
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <SettingsPanel />
        <KeepAwake />
      </body>
    </html>
  );
}
