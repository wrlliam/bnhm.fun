/** Rules and how-to-play guides for every game. Rendered at /how-to-play/[slug]. */

export type Guide = {
  slug: string;
  name: string;
  tagline: string;
  players: string;
  time: string;
  drinking: boolean;
  /** "room" = everyone on their own phone (join with a code); "phone" = one shared phone. */
  modes: { label: string; href: string; room?: boolean }[];
  overview: string;
  setup: string[];
  howToPlay: string[];
  rules?: { title: string; text: string }[];
  /** Ring of Fire renders its full card table from the shared rule data. */
  cardTable?: boolean;
  tips?: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "spotlight",
    name: "Spotlight",
    tagline: "Pick a vibe, answer in secret, then see who said what",
    players: "3–16",
    time: "10–30 min",
    drinking: false,
    modes: [{ label: "Start a room", href: "/new/spotlight", room: true }],
    overview:
      "A secret-vote party game. Pick a pack that suits the group, then flip through questions. Some are yes/no; others put two people from the room in the spotlight and everyone picks one.",
    setup: [
      "Start a Spotlight room and pick a pack: Friends, Girls' night, Lads' night, Couples, Work do, Family, Spicy (18+), or Mix it up.",
      "Choose 10, 20 or 30 questions. They're drawn at random from a bigger pack, so every game is different.",
      "Optional: anonymous results show the split but hide who voted which way.",
    ],
    howToPlay: [
      "A question appears on the TV and every phone.",
      "Yes/no questions: tap Yes or No. Pick questions: two random players from the room are shown; tap one.",
      "You can change your vote until everyone's in. Then the reveal shows the percentage for each option and, unless anonymous, the faces of who voted for it.",
      "Anyone taps Next to move on.",
    ],
    tips: ["Anonymous mode gets more honest answers. Normal mode gets more arguments."],
  },
  {
    slug: "punchline",
    name: "Punchline",
    tagline: "Write the funniest answer, then vote head to head",
    players: "3–12",
    time: "15 min",
    drinking: false,
    modes: [{ label: "Start a room", href: "/new/punchline", room: true }],
    overview: "A comedy writing game. Everyone answers prompts on their phone, then the answers battle in pairs while the rest of the room votes.",
    setup: ["Start a Punchline room. You need at least 3 players."],
    howToPlay: [
      "Writing: you get two prompts and 90 seconds. Type the funniest answer you can.",
      "Face-offs: each prompt shows with the two answers written for it, with no names shown.",
      "Everyone except the two writers votes for their favourite.",
      "The reveal shows the split, who wrote what, and the points.",
      "There are two rounds, and round two scores double.",
    ],
    rules: [
      { title: "Scoring", text: "100 points per vote (200 in round two). Taking every vote is a clean sweep, worth a bonus." },
      { title: "No answer", text: "If you run out of time your answer shows as '(no answer)' and scores nothing." },
    ],
  },
  {
    slug: "bluff",
    name: "Bluff",
    tagline: "Make up a fake answer to a weird fact and fool your friends",
    players: "3–12",
    time: "15 min",
    drinking: false,
    modes: [{ label: "Start a room", href: "/new/bluff", room: true }],
    overview: "A bluffing game built on strange but true facts. Your lie only has to be more believable than the truth.",
    setup: ["Start a Bluff room. You need at least 3 players."],
    howToPlay: [
      "A fact appears with a word missing, like 'A group of flamingos is called a ___'.",
      "Everyone writes a believable fake answer. If you accidentally type the real one, you'll be asked to write something else.",
      "All the lies plus the truth are shuffled together. Pick the one you think is real (you can't pick your own).",
      "The reveal goes through each lie, who wrote it and who fell for it, then the truth.",
    ],
    rules: [{ title: "Scoring", text: "1000 for finding the truth, and 500 for every player who picks your lie." }],
  },
  {
    slug: "odd-one-out",
    name: "Odd One Out",
    tagline: "Everyone knows the secret word except one faker",
    players: "3–12",
    time: "5 min a round",
    drinking: false,
    modes: [{ label: "Start a room", href: "/new/odd-one-out", room: true }],
    overview: "A social deduction game. Say just enough to prove you know the word, without giving it away to the faker.",
    setup: ["Start an Odd One Out room. You need at least 3 players."],
    howToPlay: [
      "Press and hold your secret card to peek. Everyone sees the same category and word, except the odd one out, who only sees the category.",
      "In the order shown, each person says one word linked to the secret word, out loud.",
      "Tap 'vote' and pick who you think is faking.",
      "If the faker gets the most votes, they get one guess at the word. Right steals the win; wrong means the group wins.",
      "A tie, or picking the wrong person, means the faker wins.",
    ],
    rules: [{ title: "Scoring", text: "The faker gets 3 for winning. When the group wins, each player gets 1, or 2 if they voted for the faker." }],
    tips: ["Too obvious and the faker learns the word. Too vague and you look like the faker."],
  },
  {
    slug: "ring-of-fire",
    name: "Ring of Fire",
    tagline: "Draw a card, follow its rule. Whoever draws the fourth King drinks the cup",
    players: "3–12",
    time: "30–60 min",
    drinking: true,
    modes: [
      { label: "Play with phones + TV", href: "/new/ring-of-fire", room: true },
      { label: "Pass one phone round", href: "/party/ring-of-fire" },
    ],
    overview:
      "A classic card-drawing game. Every card has a rule: some make one person drink, some start a mini-game, and some add lasting rules. It's simple to pick up and gets sillier as rules pile up.",
    setup: [
      "Room version: the host starts a Ring of Fire room from the home page and shares the 4-letter code. Everyone joins on their phone with a name and, optionally, a photo and whether they're a guy or a girl. That last one lets the Guys and Girls cards (5 and 6) work out who drinks on their own.",
      "The host opens the TV / admin panel on a big screen. To use a separate device (like a smart TV), open /tv there and enter the code plus the admin password shown to the host. Without the password the screen just shows the game.",
      "Optional: the host can switch off any card type, e.g. turn off Kings if you don't want a King's cup. Switched-off cards are skipped when drawing.",
      "Put an empty cup in the middle of the table for the King's cup.",
    ],
    howToPlay: [
      "Players take turns in join order. When it's your turn, your phone shows a big “Your turn” button. Tap it to draw.",
      "The card appears on the TV, and every phone explains its rule with steps and an example.",
      "If the card needs a decision (who drinks, who's your mate, what the new rule is), the drawer picks on their phone. The host can also pick for them.",
      "Anyone who has to drink gets a full-screen “Drink!” on their phone, with a buzz and the reason. They tap “Done — I drank” when finished.",
      "The next card can't be drawn until everyone who has to drink has tapped Done. The TV and phones show who you're waiting on, and the host can skip someone who's wandered off.",
      "When the deck runs out the host can shuffle in a new one and keep going, or switch on Endless so new decks keep coming until they turn it off. The fourth King (if Kings are on) means the drawer drinks the King's cup.",
    ],
    cardTable: true,
    rules: [
      {
        title: "Mates (drinking partners)",
        text: "Draw an 8 and pick a mate: from then on, whenever you drink, their phone tells them to drink too, and so on down the chain. You can't pick someone who's already your mate. If everyone already is, the 8 just passes. The host can also set partners at any time (Menu → Drinking partners, or Partners on the TV admin panel), one way or both ways.",
      },
      {
        title: "Question master",
        text: "The last person to draw a Queen gets buttons on their phone to catch anyone who answers their questions. Tapping a name makes that person drink.",
      },
      {
        title: "Getting rid of rules",
        text: "Whoever draws a Jack can spend it calling a vote to scrap an existing rule instead of making one. Everyone votes Yes or No on their phone; more yes than no removes it. The host can also remove any rule at any time.",
      },
      {
        title: "Breaking a rule",
        text: "The host can tap “drink” next to any player on the admin panel, e.g. for breaking a Jack rule.",
      },
    ],
    tips: [
      "Play in a circle so “the person before you” in Waterfall is obvious.",
      "Rules made with a Jack are listed on the TV and every phone, so nobody can claim they forgot.",
    ],
  },
  {
    slug: "most-likely-to",
    name: "Most Likely To",
    tagline: "Secret vote on who fits the card best. One sip per vote you get",
    players: "3–16",
    time: "15–30 min",
    drinking: true,
    modes: [
      { label: "Play with phones + TV", href: "/new/most-likely-to", room: true },
      { label: "Pass one phone round (point on three)", href: "/party/most-likely-to" },
    ],
    overview:
      "A “who's most likely to…” card appears, and everyone votes for the person it describes. It's great for finding out what your friends really think of you.",
    setup: [
      "The host starts a Most Likely To room and shares the code. Everyone joins on their phone.",
      "Open the TV / admin panel so everyone can see the card and the results.",
    ],
    howToPlay: [
      "The card shows on the TV and every phone.",
      "Everyone taps a player on their phone. Votes stay secret, and you can vote for yourself.",
      "Once everyone online has voted, the results appear automatically. The host can also reveal early.",
      "Each person drinks one sip per vote they got, and their phone tells them how many.",
      "Anyone taps “Next card” to move on.",
    ],
    tips: ["You can change your vote until the last person votes."],
  },
  {
    slug: "trivia",
    name: "Trivia",
    tagline: "Questions on the TV, answers on your phone. Fast right answers score the most",
    players: "1–16",
    time: "10 min",
    drinking: false,
    modes: [{ label: "Start a room", href: "/new/trivia", room: true }],
    overview: "A quick quiz round: 10 general-knowledge questions, 20 seconds each, with a live leaderboard.",
    setup: [
      "Start a Trivia room and share the code (or the QR code on the TV).",
      "Optional: the host can switch on drinking mode, where a wrong or missing answer costs a sip.",
    ],
    howToPlay: [
      "Each question shows on the TV and on every phone with four coloured answers.",
      "Tap your answer on your phone. You get one go, so no changing your mind.",
      "When everyone's answered, or after 20 seconds, the right answer is revealed.",
      "A right answer scores 500 points plus up to 500 more for speed. Highest total after 10 questions wins.",
    ],
    tips: ["Answer fast. The speed bonus decides most games."],
  },
  {
    slug: "hangman",
    name: "Hangman",
    tagline: "One person picks a word; everyone else guesses letters before the stickman is drawn",
    players: "2–16",
    time: "5 min a round",
    drinking: false,
    modes: [{ label: "Start a room", href: "/new/hangman", room: true }],
    overview: "The classic word-guessing game. The person who picks the word changes every round.",
    setup: [
      "Start a Hangman room and share the code. Everyone joins with a name and an optional photo.",
      "Optionally open the TV view so the word and stickman are on a big screen.",
    ],
    howToPlay: [
      "Anyone presses Start. The first word-picker is the person after the last picker, starting with the host.",
      "The picker types a secret word or short phrase (letters and spaces, up to 30 characters). Nobody else's device receives it.",
      "Everyone else guesses letters by tapping the keyboard or typing.",
      "Every guess pops up for all players, e.g. “Alex guessed Q: not in the word”.",
      "Each miss draws another part of the stickman: head, body, two arms, two legs. Six misses and he's hanged.",
    ],
    rules: [
      { title: "Scoring", text: "+1 for every correct letter you guess. The picker gets +3 if nobody solves the word." },
      { title: "Phrases", text: "Spaces are shown as gaps, and words only wrap between words." },
    ],
  },
  {
    slug: "higher-lower",
    name: "Higher or Lower",
    tagline: "Call the next card higher, lower or equal. Miss and drink for your whole streak",
    players: "1+",
    time: "10–20 min",
    drinking: true,
    modes: [{ label: "Play with phones + TV", href: "/new/higher-lower", room: true }, { label: "Play (one phone)", href: "/party/higher-lower" }],
    overview: "A quick streak game. The longer your run of correct calls, the more it hurts when you miss.",
    setup: ["Optionally add player names so the game tracks whose turn it is."],
    howToPlay: [
      "A card is face up. Guess whether the next card will be higher, lower or equal (the same rank).",
      "Aces are low (1), then 2–10, Jack 11, Queen 12, King 13.",
      "Get it right and your streak grows. Keep going.",
      "Get it wrong and you drink one sip per card in your streak, plus one. Then the next player goes.",
    ],
    rules: [
      { title: "Ties", text: "If the next card is the same rank, only an Equal call wins. Higher or lower loses." },
      { title: "Equal bonus", text: "A correct Equal call is rare (about 1 in 17), so it also lets you hand out 3 drinks." },
    ],
    tips: ["On an Ace, higher is the safe call. On a King, lower is."],
  },
  {
    slug: "ride-the-bus",
    name: "Ride the Bus",
    tagline: "Four right calls in a row to get off the bus",
    players: "1+",
    time: "10–20 min",
    drinking: true,
    modes: [{ label: "Play (one phone)", href: "/party/ride-the-bus" }],
    overview: "Four questions about four cards, each harder than the last. Miss one and you start again from the beginning.",
    setup: ["Optionally add player names."],
    howToPlay: [
      "Step 1, red or black: guess the colour of the next card.",
      "Step 2, higher or lower: will the next card beat your first card?",
      "Step 3, inside or outside: will the next card land strictly between your first two cards, or outside them?",
      "Step 4, suit: name the suit of the next card.",
      "Get all four and you're off the bus. The next player goes.",
    ],
    rules: [
      { title: "Missing", text: "A wrong call at step n means you drink n (1 to 4 sips), and you start again at step 1." },
      { title: "Ties", text: "Matching a card's rank in step 2 or step 3 counts as wrong." },
    ],
  },
  {
    slug: "pyramid",
    name: "Pyramid",
    tagline: "Memorise your hand, flip the pyramid, hand out drinks for matches",
    players: "2–9",
    time: "15 min",
    drinking: true,
    modes: [{ label: "Play (one phone)", href: "/party/pyramid" }],
    overview: "A memory game. Everyone gets four cards, and fifteen more are flipped from the bottom of a pyramid. Matching cards let you give out drinks.",
    setup: ["Enter everyone's name (2–9 players). Each person is dealt 4 cards."],
    howToPlay: [
      "Pass the phone round. Each person taps “Show hands”, looks at their own cards, then hides them.",
      "Flip pyramid cards one at a time, starting from the bottom row.",
      "If you hold a card with the same rank, you give out drinks equal to that row: 1 on the bottom, up to 5 at the top.",
      "When the pyramid is done, everyone reveals their hand. You drink one for every card you can't remember.",
    ],
    tips: ["Classic variant: claim a match even if you don't have one, and anyone can call your bluff. The app shows real matches only."],
  },
  {
    slug: "beat-the-dealer",
    name: "Beat the Dealer",
    tagline: "Guess the dealer's card in two tries. Miss and drink the gap",
    players: "2+",
    time: "15–30 min",
    drinking: true,
    modes: [{ label: "Play (one phone)", href: "/party/beat-the-dealer" }],
    overview: "One player deals, and everyone else tries to guess the rank of the next card. Watching which cards have already gone helps.",
    setup: ["Enter at least two names. The first person is the dealer."],
    howToPlay: [
      "The guesser picks a rank (suit doesn't matter).",
      "Right first time: the dealer drinks 4.",
      "Wrong: the app says higher or lower, and the guesser gets a second try.",
      "Right on the second try: the dealer drinks 2. Wrong again: the guesser drinks the difference between their guess and the card.",
      "After three misses in a row, the dealer passes the deck to the next player.",
    ],
    tips: ["The rank buttons show how many of each rank are already gone. If all four are out, that rank can't come up."],
  },
  {
    slug: "horse-race",
    name: "Horse Race",
    tagline: "Bet sips on an Ace. The deck decides who wins",
    players: "2+",
    time: "5–10 min",
    drinking: true,
    modes: [{ label: "Play (one phone)", href: "/party/horse-race" }],
    overview: "Pure luck and loud cheering. The four Aces race along a seven-card track, and each card drawn moves its suit forward.",
    setup: ["Everyone picks a suit and announces how many sips they're betting (1–5 is sensible)."],
    howToPlay: [
      "Draw a card. That suit's Ace moves forward one step.",
      "Seven face-down cards line the track. When every horse has passed one, it flips, and the horse of that suit goes back one step.",
      "The first horse past the finish wins.",
    ],
    rules: [{ title: "Payout", text: "Backers of the winning suit hand out double their bet. Everyone else drinks what they bet." }],
  },
  {
    slug: "never-have-i-ever",
    name: "Never Have I Ever",
    tagline: "Read the card. If you've done it, you drink",
    players: "3+",
    time: "Any",
    drinking: true,
    modes: [{ label: "Play with phones + TV", href: "/new/never-have-i-ever", room: true }, { label: "Play (one phone)", href: "/party/never-have-i-ever" }],
    overview: "Confessions, one card at a time.",
    setup: ["Optionally add names so the app shows who reads each card."],
    howToPlay: [
      "Read the card out loud: “Never have I ever…”",
      "Anyone who has done it takes a drink.",
      "Pass the phone and read the next card.",
    ],
    tips: ["Stories are optional but encouraged."],
  },
  {
    slug: "truth-or-drink",
    name: "Truth or Drink",
    tagline: "Answer honestly, or drink to dodge the question",
    players: "2+",
    time: "Any",
    drinking: true,
    modes: [{ label: "Play with phones + TV", href: "/new/truth-or-drink", room: true }, { label: "Play (one phone)", href: "/party/truth-or-drink" }],
    overview: "Personal questions. Every one can be skipped, for a price.",
    setup: ["Optionally add names to track turns."],
    howToPlay: [
      "Whoever's turn it is reads the question.",
      "They answer honestly, or take a drink and skip it.",
      "The group decides if an answer was too vague to count.",
    ],
  },
  {
    slug: "would-you-rather",
    name: "Would You Rather",
    tagline: "Pick a side on three. The smaller side drinks",
    players: "3+",
    time: "Any",
    drinking: true,
    modes: [{ label: "Play (one phone)", href: "/party/would-you-rather" }],
    overview: "Impossible choices, settled by majority.",
    setup: [],
    howToPlay: [
      "Read the card out.",
      "On three, everyone commits: hand up for the first option, down for the second.",
      "The side with fewer people drinks. On a perfect tie, everyone drinks.",
    ],
  },
  {
    slug: "card-dealer",
    name: "Card dealer",
    tagline: "Shuffle and deal hands to everyone, each with a private link",
    players: "1–10",
    time: "—",
    drinking: false,
    modes: [{ label: "Open the dealer", href: "/cards" }],
    overview: "Not a game in itself: a fair shuffle and deal for any card game you already know.",
    setup: ["Enter player names and how many cards each person gets."],
    howToPlay: [
      "Press Deal. You get a table link that shows every hand.",
      "Copy each player's private link and send it to them. It shows only their hand, behind a Reveal button.",
      "Anyone who opens the same link sees the same deal. Use “Shuffle & re-deal” for a fresh one.",
    ],
    tips: ["Private links keep people honest at the table, but the table link shows everything, so don't use it for betting."],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
