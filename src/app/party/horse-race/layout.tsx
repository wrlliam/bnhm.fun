import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("horse-race", { path: "/party/horse-race", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
