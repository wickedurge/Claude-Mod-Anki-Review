export type Status = 'active' | 'paused' | 'exited'
export type View = 'picker' | 'front' | 'back' | 'error'

export type Deck = {
  name: string
  newCount: number
  learnCount: number
  dueCount: number
}

// A card as AnkiConnect describes it: the two sides are HTML.
export type Card = {
  cardId: number
  question: string
  answer: string
}

// Whether the card just graded became a leech, and if Anki suspended it.
export type Leech = 'none' | 'leech' | 'suspended'

// How well a card was remembered, as Anki numbers it: Again, Hard, Good, Easy.
export type Ease = 1 | 2 | 3 | 4

export type Problem = { message: string; fix: string }

// What every ankiconnect function hands back: the value, or what went wrong.
export type Reply<T> = { ok: true; value: T } | { ok: false; problem: Problem }

// Everything the mod asks of Anki. The real connection and the stub both
// provide exactly this, so the rest of the mod cannot tell them apart.
export type Anki = {
  listDecks: () => Promise<Reply<Deck[]>>
  // The first card, or null when nothing is due.
  startReview: (deckName: string) => Promise<Reply<Card | null>>
  // The card Anki is showing, or null when the review is finished.
  currentCard: () => Promise<Reply<Card | null>>
  showAnswer: () => Promise<Reply<null>>
  // Grades the card with this ID; says whether it just became a leech.
  answerCard: (ease: Ease, cardId: number) => Promise<Reply<Leech>>
  // Uploads and downloads reviews through AnkiWeb.
  sync: () => Promise<Reply<null>>
}

// Developer switch: off uses real Anki; on uses the stub; down makes the
// stub fail as if Anki were not running.
export type StubMode = 'off' | 'on' | 'down'

export type Review = {
  status: Status
  view: View
  decks: Deck[]
  deck: string | null
  cardId: number | null
  front: string
  back: string
  // Shown above the next card after a card becomes a leech.
  leech: Leech
  error: Problem | null
  // A one-line message that is not an error, such as "nothing is due".
  notice: string | null
}

declare module 'claude-code' {
  interface PluginState {
    'anki-review': {
      review: Review
      stubMode: StubMode
    }
  }
}
