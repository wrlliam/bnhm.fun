"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BackIcon, LeaveIcon } from "@/components/icons";
import { guideBySlug } from "@/lib/guides";
import { rememberRoom, roomAction, saveToken } from "@/lib/rooms/client";

const link = "shrink-0 rounded-md px-3 py-1.5 font-medium text-faint transition-colors hover:bg-ink/5 hover:text-ink";

/**
 * Top bar inside a room. The links keep your seat (come back with the code, or the
 * "Back to room" link in the site nav); Leave gives it up.
 */
export function RoomNav({ code, kind, token }: { code: string; kind: string; token?: string | null }) {
  const router = useRouter();

  // remembered for the site nav's "Back to room" link
  useEffect(() => {
    if (token) rememberRoom(code);
  }, [code, token]);

  return (
    <nav aria-label="Main" className="-mx-3 mb-4 flex items-center gap-1 overflow-x-auto text-sm">
      <Link href="/" className={`${link} inline-flex items-center gap-1 pl-2`}>
        <BackIcon />
        Games
      </Link>
      <Link href="/party" className={link}>
        One phone
      </Link>
      {guideBySlug(kind) && (
        <Link href={`/how-to-play/${kind}`} className={link}>
          Rules
        </Link>
      )}
      {token && (
        <button
          onClick={async () => {
            if (!confirm("Leave this room? You'll need the code to join again.")) return;
            await roomAction(code, { type: "leave", token });
            saveToken(code, null);
            router.push("/");
          }}
          className={`${link} ml-auto inline-flex items-center gap-1.5 hover:text-miss`}
        >
          <LeaveIcon />
          Leave
        </button>
      )}
    </nav>
  );
}
