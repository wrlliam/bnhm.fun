import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("beat-the-dealer", { path: "/party/beat-the-dealer", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
