import { gameMetadata } from "@/lib/seo";

export const metadata = gameMetadata("ride-the-bus", { path: "/party/ride-the-bus", prefix: "Play" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
