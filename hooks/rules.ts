// The rules: given what memory holds and what just happened, what memory
// should hold next. They never talk to Anki or the engine themselves.
import type { Deck, Reply, Review } from '../types'

export const START: Review = {
  status: 'exited',
  view: 'picker',
  decks: [],
  deck: null,
  cardId: null,
  front: '',
  back: '',
  hasLeechNotice: false,
  error: null,
}

export function isComplete(deck: Deck): boolean {
  return deck.newCount + deck.learnCount + deck.dueCount === 0
}

export function afterDeckList(now: Review, reply: Reply<Deck[]>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }

  return { ...now, view: 'picker', decks: reply.value, error: null }
}

// Placeholder until starting a review exists: only records the choice.
export function afterPick(now: Review, name: string): Review {
  return { ...now, deck: name }
}
