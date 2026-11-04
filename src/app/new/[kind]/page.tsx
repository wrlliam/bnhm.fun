import { Suspense } from "react";
import type { Metadata } from "next";
import { GAMES_CATALOG, gameMeta } from "@/lib/catalog";
import { NewRoom } from "./new-room";

export function generateStaticParams() {
  return GAMES_CATALOG.map((g) => ({ kind: g.kind }));
}

export async function generateMetadata({ params }: PageProps<"/new/[kind]">): Promise<Metadata> {
  const g = gameMeta((await params).kind);
  return g ? { title: `Start ${g.name}`, description: `${g.tagline}. ${g.steps.join(". ")}.` } : { title: "Start a game" };
}

export default function NewRoomPage({ params }: PageProps<"/new/[kind]">) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/new/[kind]">["params"] }) {
  const { kind } = await params;
  return <NewRoom kind={kind} />;
}
