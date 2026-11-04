import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("most-likely-to", { path: "/party/most-likely-to", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
