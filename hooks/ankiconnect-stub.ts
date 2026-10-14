// Stand-in for the real ankiconnect piece: same job, made-up answers.
// Nothing here contacts Anki.
import type { Card, Deck, Problem, Reply } from '../types'

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
]

// The first card of each sample deck; each one exercises a different case.
// A deck that is absent here has nothing due.
const FIRST_CARD: Record<string, Card> = {
  'Spanish vocabulary': {
    cardId: 1001,
    question: 'el desarrollo',
    answer: 'development; growth<br><i>El desarrollo del proyecto va bien.</i>',
  },
  'TypeScript terms': {
    cardId: 1002,
    question:
      'What does a union type such as <code>\'active\' | \'paused\' | \'exited\'</code> let the type checker do when code assigns a value to a variable declared with it, and why does that make some bugs impossible to write rather than merely unlikely to happen at run time?',
    answer: 'It refuses any value outside the listed options.',
  },
  'Languages::Spanish::Irregular verbs': {
    cardId: 1003,
    question: '<div><b>tener<i> (yo, presente)</b></div><span style="color:red">&amp; ir',
    answer: 'tengo &lt;irregular&gt;',
  },
  [LONG_NAME]: {
    cardId: 1004,
    question: '<img src="paste-123.jpg">',
    answer: 'A picture of a cat [sound:gato.mp3]',
  },
  'Sample: missing front': { cardId: 1005, question: '', answer: 'An answer with no question' },
  'Sample: missing back': { cardId: 1006, question: 'A question with no answer', answer: '' },
}

const NOT_RUNNING: Problem = {
  message: 'Could not reach Anki.',
  fix: 'Start Anki, check the AnkiConnect add-on is installed, then run /anki.',
}

// isDown is the developer switch: true answers as if Anki were not running.
export async function listDecks(isDown: boolean): Promise<Reply<Deck[]>> {
  if (isDown) {
    return { ok: false, problem: NOT_RUNNING }
  }

  return { ok: true, value: SAMPLE_DECKS }
}

// Starts reviewing a deck and returns its first card, or null when nothing is due.
export async function startReview(deckName: string, isDown: boolean): Promise<Reply<Card | null>> {
  if (isDown) {
    return { ok: false, problem: NOT_RUNNING }
  }

  return { ok: true, value: FIRST_CARD[deckName] ?? null }
}
