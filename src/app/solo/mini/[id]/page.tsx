import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MINI_PUZZLES } from "@/lib/minigrid";
import { MiniGrid } from "./mini-grid";

export function generateStaticParams() {
  return MINI_PUZZLES.map((p) => ({ id: String(p.id) }));
}

export const metadata: Metadata = {
  title: "Mini Grid crossword",
  description: "A tiny crossword you can finish in a couple of minutes.",
};

export default function MiniPage({ params }: PageProps<"/solo/mini/[id]">) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/solo/mini/[id]">["params"] }) {
  const id = Number((await params).id);
  const puzzle = MINI_PUZZLES.find((p) => p.id === id);
  if (!puzzle) notFound();
  return <MiniGrid puzzle={puzzle} total={MINI_PUZZLES.length} />;
}
