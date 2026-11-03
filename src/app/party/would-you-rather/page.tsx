import { Suspense } from "react";
import { WOULD_YOU_RATHER as PROMPTS } from "@/lib/prompts";
import { PromptGame } from "../prompt-game";
import { GameShell } from "../shared";

export default function WouldYouRatherPage() {
  return (
    <GameShell title="Would You Rather">
      <Suspense>
        <PromptGame
          prompts={PROMPTS}
          prefix="Would you rather"
          rule="On three, everyone picks a side (hands up for the first option). The smaller side drinks. A perfect tie? Everyone drinks."
          intro={
            <>
              Read the card out. On three, everyone commits to an answer — raise your hand for the first option, keep
              it down for the second. Whichever side has fewer people drinks.
            </>
          }
        />
      </Suspense>
    </GameShell>
  );
}
