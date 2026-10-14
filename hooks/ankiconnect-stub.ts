// Stand-in for the real ankiconnect piece: same job, made-up answers.
// Nothing here contacts Anki.
import type { Anki, Card, Deck, Ease, Leech, Problem, Reply } from '../types'

const LONG_NAME =
  'A deck whose name is long enough that it cannot fit on one line of the pane at any width'

const SAMPLE_DECKS: Deck[] = [
  { name: 'Spanish vocabulary', newCount: 11, learnCount: 7, dueCount: 0 },
  { name: 'TypeScript terms', newCount: 0, learnCount: 0, dueCount: 78 },
  { name: 'Finished deck', newCount: 0, learnCount: 0, dueCount: 0 },
  { name: 'Languages::Spanish::Irregular verbs', newCount: 20, learnCount: 8, dueCount: 40 },
  { name: LONG_NAME, newCount: 3, learnCount: 0, dueCount: 1204 },
  { name: 'Sample: missing front', newCount: 1, learnCount: 0, dueCount: 0 },
  { name: 'Sample: missing back', newCount: 1, learnCount: 0, dueCount: 0 },
  { name: 'Sample: leech', newCount: 0, learnCount: 0, dueCount: 2 },
]

// The cards due in each sample deck; each first card exercises a different
// case. A deck that is absent here has nothing due.
// Pressing Again on this card makes it a leech that Anki suspends.
const LEECH_CARD = 1007

const CARDS: Record<string, Card[]> = {
  'Spanish vocabulary': [
    {
      cardId: 1001,
      question: 'el desarrollo',
      answer: 'development; growth<br><i>El desarrollo del proyecto va bien.</i>',
    },
    { cardId: 1011, question: 'la herramienta', answer: 'tool' },
    { cardId: 1012, question: 'aprender', answer: 'to learn' },
  ],
  'TypeScript terms': [{
    cardId: 1002,
    question:
      'What does a union type such as <code>\'active\' | \'paused\' | \'exited\'</code> let the type checker do when code assigns a value to a variable declared with it, and why does that make some bugs impossible to write rather than merely unlikely to happen at run time?',
    answer: 'It refuses any value outside the listed options.',
  }],
  'Languages::Spanish::Irregular verbs': [{
    cardId: 1003,
    question: '<div><b>tener<i> (yo, presente)</b></div><span style="color:red">&amp; ir',
    answer: 'tengo &lt;irregular&gt;',
  }],
  [LONG_NAME]: [{
    cardId: 1004,
    question: '<img src="paste-123.jpg">',
    answer: 'A picture of a cat [sound:gato.mp3]',
  }],
  'Sample: missing front': [{ cardId: 1005, question: '', answer: 'An answer with no question' }],
  'Sample: missing back': [{ cardId: 1006, question: 'A question with no answer', answer: '' }],
  'Sample: leech': [
    { cardId: LEECH_CARD, question: 'A card you keep forgetting', answer: 'Press Again to make it a leech' },
    { cardId: 1017, question: 'The card after the leech', answer: 'The notice is gone now' },
  ],
}

const NOT_RUNNING: Problem = {
  message: 'Could not reach Anki.',
  fix: 'Start Anki, check the AnkiConnect add-on is installed, then run /anki.',
}

// The cards left in the review under way, the one Anki is showing first.
// Lost when the mod reloads, which is acceptable for a stand-in.
let queue: Card[] = []

// isDown makes every function fail as if Anki were not running.
export function stubAnki(isDown: boolean): Anki {
  const fail = { ok: false, problem: NOT_RUNNING } as const

  return {
    async listDecks(): Promise<Reply<Deck[]>> {
      return isDown ? fail : { ok: true, value: SAMPLE_DECKS }
    },

    async startReview(deckName: string): Promise<Reply<Card | null>> {
      if (isDown) {
        return fail
      }
      queue = [...(CARDS[deckName] ?? [])]

      return { ok: true, value: queue[0] ?? null }
    },

    async currentCard(): Promise<Reply<Card | null>> {
      return isDown ? fail : { ok: true, value: queue[0] ?? null }
    },

    async sync(): Promise<Reply<null>> {
      return isDown ? fail : { ok: true, value: null }
    },

    async showAnswer(): Promise<Reply<null>> {
      return isDown ? fail : { ok: true, value: null }
    },

    // Again sends the card to the back of the queue, as Anki shows a failed
    // card again soon; any other grade removes it. The leech sample card is
    // suspended instead, so it does not come back.
    async answerCard(ease: Ease, cardId: number): Promise<Reply<Leech>> {
      if (isDown) {
        return fail
      }
      const [graded, ...rest] = queue
      if (ease === 1 && cardId === LEECH_CARD) {
        queue = rest
        return { ok: true, value: 'suspended' }
      }
      if (graded) {
        queue = ease === 1 ? [...rest, graded] : rest
      }

      return { ok: true, value: 'none' }
    },
  }
}
