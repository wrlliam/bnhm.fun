import { Suspense } from "react";
import { TvClient } from "./tv-client";

export default function TvPage() {
  return (
    <Suspense fallback={<main className="flex flex-1 items-center justify-center font-hand text-4xl text-faint">Loading…</main>}>
      <TvClient />
    </Suspense>
  );
}
