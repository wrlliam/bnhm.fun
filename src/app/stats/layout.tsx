import type { Metadata } from "next";
import { PRIVATE } from "@/lib/seo";

export const metadata: Metadata = { title: "Stats", robots: PRIVATE };

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
