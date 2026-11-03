import { Suspense } from "react";
import { RoomClient } from "./room-client";

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center">
          <p className="font-hand text-3xl text-faint">Loading…</p>
        </main>
      }
    >
      <RoomClient />
    </Suspense>
  );
}
