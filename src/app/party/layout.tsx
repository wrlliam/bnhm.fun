import type { Metadata } from "next";
import { SHARE } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pass-the-phone party card games",
  description:
    "Ring of Fire, Higher or Lower, Ride the Bus, Pyramid, Beat the Dealer, Horse Race, Never Have I Ever and more. One phone, one shuffled deck, shareable by link.",
  alternates: { canonical: "/party" },
  openGraph: { ...SHARE.openGraph, url: "/party" },
  twitter: SHARE.twitter,
};

export default function PartyLayout({ children }: LayoutProps<"/party">) {
  return children;
}
