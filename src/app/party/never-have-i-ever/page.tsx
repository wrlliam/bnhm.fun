import { Suspense } from "react";
import { NEVER_HAVE_I_EVER as PROMPTS } from "@/lib/prompts";
import { PromptGame } from "../prompt-game";
import { GameShell } from "../shared";

export default function NeverHaveIEverPage() {
  return (
    <GameShell title="Never Have I Ever">
      <Suspense>
        <PromptGame
          prompts={PROMPTS}
          prefix="Never have I ever"
          rule="Anyone who HAS done it drinks. Story time is optional but encouraged."
          intro={
            <>Read the card out. Anyone who has done it takes a drink. Pass the phone along and keep going.</>
          }
        />
      </Suspense>
    </GameShell>
  );
}
