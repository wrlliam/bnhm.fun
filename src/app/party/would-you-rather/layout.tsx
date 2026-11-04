import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("would-you-rather", { path: "/party/would-you-rather", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
