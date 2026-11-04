import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("card-dealer", { path: "/cards" });

export default function CardsLayout({ children }: LayoutProps<"/cards">) {
  return children;
}
