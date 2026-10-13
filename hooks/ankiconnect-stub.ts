// Stand-in for the real ankiconnect piece: same job, made-up answers.
// Nothing here contacts Anki.
import type { Deck, Reply } from '../types'

const SAMPLE_DECKS: Deck[] = [
  { name: 'Spanish vocabulary', newCount: 11, learnCount: 7, dueCount: 0 },
  { name: 'TypeScript terms', newCount: 0, learnCount: 0, dueCount: 78 },
  { name: 'Finished deck', newCount: 0, learnCount: 0, dueCount: 0 },
  { name: 'Languages::Spanish::Irregular verbs', newCount: 20, learnCount: 8, dueCount: 40 },
  {
    name: 'A deck whose name is long enough that it cannot fit on one line of the pane at any width',
    newCount: 3,
    learnCount: 0,
    dueCount: 1204,
  },
]

// isDown is the developer switch: true answers as if Anki were not running.
export async function listDecks(isDown: boolean): Promise<Reply<Deck[]>> {
  if (isDown) {
    return {
      ok: false,
      problem: {
        message: 'Could not reach Anki.',
        fix: 'Start Anki, check the AnkiConnect add-on is installed, then run /anki.',
      },
    }
  }

  return { ok: true, value: SAMPLE_DECKS }
}
