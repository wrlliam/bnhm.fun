import { Suspense } from "react";
import { MOST_LIKELY_TO as PROMPTS } from "@/lib/prompts";
import { PromptGame } from "../prompt-game";
import { GameShell } from "../shared";

export default function MostLikelyToPage() {
  return (
    <GameShell title="Most Likely To">
      <Suspense>
        <PromptGame
          prompts={PROMPTS}
          prefix="Who's most likely to"
          rule="On three, everyone points. Drink once for every finger pointing at you."
          intro={
            <>Read the card, count to three, and everyone points at who fits best. Fingers pointing at you = sips.</>
          }
        />
      </Suspense>
    </GameShell>
  );
}
