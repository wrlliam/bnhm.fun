import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("pyramid", { path: "/party/pyramid", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
