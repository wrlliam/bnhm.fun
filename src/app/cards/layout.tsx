import type { Metadata } from "next";

export const metadata: Metadata = { title: "Card dealer" };

export default function CardsLayout({ children }: LayoutProps<"/cards">) {
  return children;
}
