import type { Card } from "@/lib/cards";

export type Rule = { name: string; text: string; how: string[]; example?: string };

export const RULES: Record<Card["rank"], Rule> = {
  A: {
    name: "Waterfall",
    text: "Everyone drinks in a chain. You can't stop until the person before you stops.",
    how: [
      "Whoever drew the card starts drinking, then everyone else starts, going round the circle.",
      "The person who drew it can stop whenever they like.",
      "Each person can only stop once the person before them has stopped.",
    ],
    example: "Sam drew it, so Sam stops first. Alex (next to Sam) can stop as soon as Sam does. Jo has to wait for Alex.",
  },
  "2": {
    name: "You",
    text: "Pick someone to drink.",
    how: ["Point at anyone in the group.", "They take a drink."],
  },
  "3": {
    name: "Me",
    text: "You drink.",
    how: ["Whoever drew the card takes a drink. That's it."],
  },
  "4": {
    name: "Floor",
    text: "Last person to touch the floor drinks.",
    how: [
      "As soon as the card is shown, everyone slaps the floor (or the table if you're outside).",
      "The slowest person drinks.",
    ],
  },
  "5": {
    name: "Guys",
    text: "All the guys drink.",
    how: [
      "Everyone who identifies as a guy takes a drink.",
      "In a room game, phones of anyone who picked “Guy” when joining buzz automatically. The drawer is only asked about people who skipped.",
    ],
  },
  "6": {
    name: "Girls",
    text: "All the girls drink.",
    how: [
      "Everyone who identifies as a girl takes a drink.",
      "In a room game, phones of anyone who picked “Girl” when joining buzz automatically. The drawer is only asked about people who skipped.",
    ],
  },
  "7": {
    name: "Heaven",
    text: "Last person to point to the sky drinks.",
    how: ["Everyone points straight up as fast as they can.", "Slowest hand drinks."],
  },
  "8": {
    name: "Mate",
    text: "Pick a drinking partner. Whenever you drink, they drink too.",
    how: [
      "Choose one person to be your mate (drinking partner).",
      "For the rest of the game, every time you drink, they drink as well. In a room game their phone tells them automatically.",
      "It doesn't work the other way: if they drink, you don't have to (unless the host pairs you both ways).",
    ],
    example: "Sam picks Jo. Later Sam draws a 3 (Me), so Sam and Jo both drink.",
  },
  "9": {
    name: "Rhyme",
    text: "Say a word, then everyone takes turns rhyming it.",
    how: [
      "Whoever drew the card says a word.",
      "Going round the circle, each person says a word that rhymes with it.",
      "The first person who hesitates, repeats a word, or can't think of one drinks.",
    ],
    example: "“Cat” → “hat” → “mat” → “bat” → … → “uhh…” Drink.",
  },
  "10": {
    name: "Categories",
    text: "Pick a category, then everyone takes turns naming things in it.",
    how: [
      "Whoever drew the card picks a category.",
      "Going round the circle, each person names something in it.",
      "The first person who hesitates, repeats an answer, or gets it wrong drinks.",
    ],
    example: "“Types of cheese”: cheddar, brie, gouda, feta, …",
  },
  J: {
    name: "Make a rule",
    text: "Invent a rule everyone must follow — or call a vote to scrap an existing one.",
    how: [
      "Choose ONE: make a new rule, or call a vote to scrap a rule that's already in play.",
      "New rule: it lasts until the end of the game. Anyone caught breaking it drinks.",
      "Vote: everyone votes on their phone. More yes than no and the rule is gone; a tie keeps it. You don't get to add a rule that turn.",
    ],
    example: "“No saying anyone's name” — or, three Jacks later, “let's vote to scrap the no-names rule.”",
  },
  Q: {
    name: "Question master",
    text: "You're the question master until someone else draws a Queen.",
    how: [
      "If anyone answers a question you ask them, they drink.",
      "They can dodge it by replying “F you, question master” (or any comeback you agree on).",
      "Your power ends when someone else draws a Queen.",
    ],
    example: "Question master: “What time is it?” Alex: “About nine.” Alex drinks.",
  },
  K: {
    name: "King's cup",
    text: "Pour some of your drink into the cup in the middle.",
    how: [
      "Tip a splash of your drink into the shared cup in the middle of the ring.",
      "Whoever draws the fourth King has to drink the whole cup.",
    ],
  },
};

export const RANK_ORDER: Card["rank"][] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
