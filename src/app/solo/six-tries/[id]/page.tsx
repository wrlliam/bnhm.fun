import { Suspense } from "react";
import type { Metadata } from "next";
import { SixTries } from "./six-tries";

export const metadata: Metadata = {
  title: "Six Tries",
  description: "Can you guess the word in six tries? See how everyone else did.",
  robots: { index: false, follow: false },
};

export default function SixTriesPage({ params }: PageProps<"/solo/six-tries/[id]">) {
  return (
    <Suspense>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/solo/six-tries/[id]">["params"] }) {
  const { id } = await params;
  return <SixTries id={id} />;
}
