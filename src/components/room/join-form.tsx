"use client";

import { useRef, useState } from "react";
import { fileToAvatar, loadProfile, roomAction, saveProfile, saveToken } from "@/lib/rooms/client";

/** Name + optional photo. Used to join a room and to edit your profile once in. */
export function JoinForm({
  code,
  title,
  hostToken,
  submitLabel = "Join",
  token,
  onDone,
}: {
  code: string;
  title: React.ReactNode;
  hostToken?: string | null;
  submitLabel?: string;
  /** When set, edits this player's profile instead of joining. */
  token?: string;
  onDone?: () => void;
}) {
  const [initial] = useState(loadProfile);
  const [name, setName] = useState(initial.name);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar);
  const [group, setGroup] = useState(initial.group);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  return (
    <form
      className="w-full max-w-sm text-left"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await roomAction(
          code,
          token
            ? { type: "profile", token, name, avatar, group }
            : { type: "join", name, avatar, group, hostToken: hostToken ?? undefined },
        );
        setBusy(false);
        if (!res.ok) return setError(res.error);
        saveProfile({ name: name.trim(), avatar, group });
        if (!token) saveToken(code, res.token as string);
        onDone?.();
      }}
    >
      <div className="font-hand text-5xl font-bold leading-tight">{title}</div>

      <div className="mt-8 flex items-center gap-5">
        <button
          type="button"
          onClick={() => file.current?.click()}
          className="group relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-ink/50 transition-colors hover:border-ink"
          aria-label={avatar ? "Change photo" : "Add a photo"}
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full flex-col items-center justify-center text-xs text-faint group-hover:text-ink">
              <span className="text-3xl leading-none">+</span>
              photo
            </span>
          )}
        </button>
        <div className="text-sm text-faint">
          <p>Profile picture (optional).</p>
          {avatar && (
            <button type="button" onClick={() => setAvatar(null)} className="mt-1 underline underline-offset-4 hover:text-miss">
              Remove
            </button>
          )}
        </div>
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              setAvatar(await fileToAvatar(f));
            } catch (err) {
              setError((err as Error).message);
            }
          }}
        />
      </div>

      <label htmlFor="join-name" className="mt-6 block text-sm font-medium">
        Your name
      </label>
      <input
        id="join-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={20}
        autoComplete="nickname"
        placeholder="Sam"
        className="mt-1 w-full border-b-2 border-ink bg-transparent py-1 font-hand text-4xl outline-none placeholder:text-faint/60"
      />
      <fieldset className="mt-6">
        <legend className="text-sm font-medium">
          Guy or girl? <span className="font-normal text-faint">(optional)</span>
        </legend>
        <div className="mt-2 flex gap-2">
          {(
            [
              ["guy", "Guy"],
              ["girl", "Girl"],
              [null, "Skip"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={label}
              type="button"
              aria-pressed={group === value}
              onClick={() => setGroup(value)}
              className={`flex-1 rounded-md border-2 py-2 text-sm font-medium transition-colors ${
                group === value ? "border-ink bg-ink text-paper" : "border-ink/30 hover:border-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-faint">
          Used for cards like Guys and Girls in Ring of Fire, so your phone knows when to tell you to drink.
        </p>
      </fieldset>

      <button
        disabled={busy || !name.trim()}
        className="mt-8 w-full rounded-md bg-ink py-3 font-medium text-paper transition-colors hover:bg-ink/90 disabled:opacity-40"
      >
        {busy ? "…" : submitLabel}
      </button>
      {error && <p className="pop mt-4 text-sm text-miss">{error}</p>}
    </form>
  );
}
