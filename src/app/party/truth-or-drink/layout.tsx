import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("truth-or-drink", { path: "/party/truth-or-drink", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
