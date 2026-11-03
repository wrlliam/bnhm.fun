import { Suspense } from "react";
import { TRUTH_OR_DRINK as PROMPTS } from "@/lib/prompts";
import { PromptGame } from "../prompt-game";
import { GameShell } from "../shared";

export default function TruthOrDrinkPage() {
  return (
    <GameShell title="Truth or Drink">
      <Suspense>
        <PromptGame
          prompts={PROMPTS}
          rule="Answer honestly, or take a drink and skip it. The group decides if an answer was too vague to count."
          intro={
            <>
              Whoever&rsquo;s turn it is reads the question to themselves and answers it out loud — or refuses and
              drinks instead. Pass the phone along each card.
            </>
          }
        />
      </Suspense>
    </GameShell>
  );
}
