// The rules: given what memory holds and what just happened, what memory
// should hold next. They never talk to Anki or the engine themselves.
import type { Card, Deck, Reply, Review } from '../types'
import { htmlToText } from './text'

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
  notice: null,
}

export function isComplete(deck: Deck): boolean {
  return deck.newCount + deck.learnCount + deck.dueCount === 0
}

export function afterDeckList(now: Review, reply: Reply<Deck[]>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }

  return { ...now, view: 'picker', decks: reply.value, error: null, notice: null }
}

export const NOTHING_DUE = 'Nothing is due in this deck. To study more, use Custom Study in Anki.'

export function afterStart(now: Review, deckName: string, reply: Reply<Card | null>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }
  if (reply.value === null) {
    return { ...now, view: 'picker', notice: NOTHING_DUE, error: null }
  }

  return { ...afterNextCard(now, reply), deck: deckName }
}

export function afterShowAnswer(now: Review, reply: Reply<null>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }

  return { ...now, view: 'back', error: null }
}

export const DECK_FINISHED = 'You have finished this deck for now.'

// The card-ID check: is Anki still showing the card memory holds?
export function isSameCard(now: Review, current: Reply<Card | null>): boolean {
  return current.ok && current.value !== null && current.value.cardId === now.cardId
}

// After grading, or when Anki turned out to be on another card.
export function afterNextCard(now: Review, reply: Reply<Card | null>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }
  if (reply.value === null) {
    return { ...afterExit(now), notice: DECK_FINISHED }
  }

  return {
    ...now,
    status: 'active',
    view: 'front',
    cardId: reply.value.cardId,
    front: htmlToText(reply.value.question),
    back: htmlToText(reply.value.answer),
    notice: null,
    error: null,
  }
}

export function afterExit(now: Review): Review {
  return { ...now, status: 'exited', view: 'picker', deck: null, cardId: null, front: '', back: '', notice: null }
}
