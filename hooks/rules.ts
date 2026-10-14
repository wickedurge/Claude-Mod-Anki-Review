// The rules: given what memory holds and what just happened, what memory
// should hold next. They never talk to Anki or the engine themselves.
import type { Card, Deck, Leech, Reply, Review } from '../types'
import { htmlToText } from './text'

export const START: Review = {
  status: 'exited',
  view: 'picker',
  decks: [],
  deck: null,
  cardId: null,
  front: '',
  back: '',
  leech: 'none',
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

  return { ...now, view: 'picker', decks: reply.value, error: null, notice: null, leech: 'none' }
}

export const NOTHING_DUE = 'Nothing is due in this deck. To study more, use Custom Study in Anki.'

export function afterStart(now: Review, deckName: string, reply: Reply<Card | null>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }
  if (reply.value === null) {
    return { ...now, view: 'picker', notice: NOTHING_DUE, error: null }
  }

  return { ...afterNextCard(now, reply), deck: deckName, leech: 'none' }
}

export function afterShowAnswer(now: Review, reply: Reply<null>): Review {
  if (!reply.ok) {
    return { ...now, view: 'error', error: reply.problem }
  }

  // The leech notice has been read by the time the answer is asked for.
  return { ...now, view: 'back', error: null, leech: 'none' }
}

export const DECK_FINISHED = 'You have finished this deck for now.'

// Sync results go on the finished line: the reviews are already saved in
// Anki, so a failed sync is out of date, not lost, and blocks nothing.
export function afterSyncStart(now: Review): Review {
  return { ...now, notice: `${DECK_FINISHED} Syncing with AnkiWeb…` }
}

export function afterSync(now: Review, reply: Reply<null>): Review {
  const result = reply.ok ? 'Synced with AnkiWeb.' : `Could not sync: ${reply.problem.message}`

  return { ...now, notice: `${DECK_FINISHED} ${result}` }
}

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

// After a grade: the next card (or the end of the deck), with any leech notice.
export function afterGrade(now: Review, next: Reply<Card | null>, leech: Leech): Review {
  const moved = afterNextCard(now, next)

  return moved.view === 'error' ? moved : { ...moved, leech }
}

export function afterExit(now: Review): Review {
  return {
    ...now,
    status: 'exited',
    view: 'picker',
    deck: null,
    cardId: null,
    front: '',
    back: '',
    notice: null,
    leech: 'none',
  }
}

// Whether to ask for the keyboard back when a tool call ends. Claude Code
// does not say when a permission prompt is up; the sign is the pane losing
// the keyboard during a call it had the keyboard at the start of.
export function shouldTakeKeyboardBack(when: {
  isOn: boolean
  isPaneOpen: boolean
  hadKeyboardAtStart: boolean
  lostKeyboardDuring: boolean
}): boolean {
  return when.isOn && when.isPaneOpen && when.hadKeyboardAtStart && when.lostKeyboardDuring
}
