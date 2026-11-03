import type { RoomView } from "@/lib/rooms/client";
import { Avatar } from "./avatar";

export function PlayerList({
  room,
  highlight,
  badge,
  onKick,
  size = 40,
}: {
  room: RoomView;
  highlight?: string | null;
  badge?: (id: string) => React.ReactNode;
  onKick?: (id: string) => void;
  size?: number;
}) {
  return (
    <ul className="space-y-2">
      {room.players.map((p) => (
        <li key={p.id} className={`flex items-center gap-3 rounded-lg px-2 py-1 ${highlight === p.id ? "bg-ink/5" : ""}`}>
          <Avatar player={p} size={size} dim={!p.online} ring={highlight === p.id ? "ring-hit" : undefined} />
          <span className={`font-hand text-2xl font-bold ${p.id === room.me ? "underline decoration-1 underline-offset-4" : ""}`}>
            {p.name}
          </span>
          {p.id === room.hostPlayerId && <span className="text-xs text-faint">host</span>}
          {!p.online && <span className="text-xs text-faint">away</span>}
          <span className="ml-auto flex items-center gap-2 text-sm">
            {badge?.(p.id)}
            {onKick && p.id !== room.me && (
              <button
                onClick={() => confirm(`Remove ${p.name} from the room?`) && onKick(p.id)}
                className="text-xs text-faint underline underline-offset-2 hover:text-miss"
              >
                remove
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
