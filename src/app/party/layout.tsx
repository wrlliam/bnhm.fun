import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Party cards",
  description: "Ring of Fire, Higher or Lower, Ride the Bus and more — one shuffled deck, shareable by link.",
};

export default function PartyLayout({ children }: LayoutProps<"/party">) {
  return children;
}
