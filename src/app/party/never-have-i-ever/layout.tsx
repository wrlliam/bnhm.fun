import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("never-have-i-ever", { path: "/party/never-have-i-ever", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
