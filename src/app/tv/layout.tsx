import type { Metadata } from "next";
import { PRIVATE } from "@/lib/seo";

export const metadata: Metadata = { title: "TV screen", robots: PRIVATE };

export default function TvLayout({ children }: LayoutProps<"/tv">) {
  return children;
}
