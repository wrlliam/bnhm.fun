import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("ring-of-fire", { path: "/party/ring-of-fire", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
