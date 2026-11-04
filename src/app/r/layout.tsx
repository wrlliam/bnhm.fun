import type { Metadata } from "next";
import { PRIVATE } from "@/lib/seo";

export const metadata: Metadata = { title: "Game room", robots: PRIVATE };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
