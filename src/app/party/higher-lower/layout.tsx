import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("higher-lower", { path: "/party/higher-lower", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
