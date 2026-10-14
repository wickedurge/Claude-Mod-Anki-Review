import { expect, test } from 'claude-code/testing'

import type { Card, Deck, Problem, Review } from '../types'
import {
  DECK_FINISHED,
  NOTHING_DUE,
  START,
  afterDeckList,
  afterExit,
  afterNextCard,
  afterShowAnswer,
  afterStart,
  isComplete,
  isSameCard,
} from './rules'

const DECKS: Deck[] = [
  { name: 'Spanish vocabulary', newCount: 11, learnCount: 7, dueCount: 0 },
  { name: 'Finished deck', newCount: 0, learnCount: 0, dueCount: 0 },
]

const PROBLEM: Problem = { message: 'Could not reach Anki.', fix: 'Start Anki.' }

test('AC2: a successful deck list gives the picker with those decks and no error', () => {
  const next = afterDeckList(START, { ok: true, value: DECKS })

  expect(next.view).toBe('picker')
  expect(next.decks).toEqual(DECKS)
  expect(next.error).toBe(null)
})

test('AC3: a failed deck list gives the error view with the message and the fix', () => {
  const next = afterDeckList(START, { ok: false, problem: PROBLEM })

  expect(next.view).toBe('error')
  expect(next.error).toEqual(PROBLEM)
})

test('AC4: an error followed by a successful deck list clears the error', () => {
  const failed: Review = afterDeckList(START, { ok: false, problem: PROBLEM })
  const next = afterDeckList(failed, { ok: true, value: DECKS })

  expect(next.view).toBe('picker')
  expect(next.error).toBe(null)
  expect(next.decks).toEqual(DECKS)
})

test('AC5: a deck is complete only when all three counts are zero', () => {
  expect(isComplete({ name: 'a', newCount: 0, learnCount: 0, dueCount: 0 })).toBe(true)
  expect(isComplete({ name: 'b', newCount: 1, learnCount: 0, dueCount: 0 })).toBe(false)
  expect(isComplete({ name: 'c', newCount: 0, learnCount: 1, dueCount: 0 })).toBe(false)
  expect(isComplete({ name: 'd', newCount: 0, learnCount: 0, dueCount: 1 })).toBe(false)
})

const CARD: Card = { cardId: 1001, question: '<b>el desarrollo</b>', answer: 'development<br>growth' }

// Issue #4: start a review from the picker.

test('#4: a deck with cards gives the front of its first card, as plain text', () => {
  const loaded = afterDeckList(START, { ok: true, value: DECKS })
  const next = afterStart(loaded, 'Spanish vocabulary', { ok: true, value: CARD })

  expect(next.status).toBe('active')
  expect(next.view).toBe('front')
  expect(next.deck).toBe('Spanish vocabulary')
  expect(next.cardId).toBe(1001)
  expect(next.front).toBe('el desarrollo')
  expect(next.back).toBe('development\ngrowth')
})

test('#4: a complete deck stays on the picker with the nothing-due notice', () => {
  const loaded = afterDeckList(START, { ok: true, value: DECKS })
  const next = afterStart(loaded, 'Finished deck', { ok: true, value: null })

  expect(next.view).toBe('picker')
  expect(next.notice).toBe(NOTHING_DUE)
  expect(next.status).toBe('exited')
  expect(next.cardId).toBe(null)
})

test('#4: a failed start gives the error view', () => {
  const next = afterStart(START, 'Spanish vocabulary', { ok: false, problem: PROBLEM })

  expect(next.view).toBe('error')
  expect(next.error).toEqual(PROBLEM)
})

test('#4: starting a deck clears an earlier notice', () => {
  const nothing = afterStart(START, 'Finished deck', { ok: true, value: null })
  const next = afterStart(nothing, 'Spanish vocabulary', { ok: true, value: CARD })

  expect(next.notice).toBe(null)
})

test('#4: exit returns to the picker and forgets the card but keeps the decks', () => {
  const loaded = afterDeckList(START, { ok: true, value: DECKS })
  const reviewing = afterStart(loaded, 'Spanish vocabulary', { ok: true, value: CARD })
  const next = afterExit(reviewing)

  expect(next).toEqual(loaded)
})

// Issue #5: show the answer.

test('#5: showing the answer moves from the front to the back and keeps the card', () => {
  const front = afterStart(START, 'Spanish vocabulary', { ok: true, value: CARD })
  const next = afterShowAnswer(front, { ok: true, value: null })

  expect(next.view).toBe('back')
  expect(next).toEqual({ ...front, view: 'back' })
})

test('#5: a failed show-answer gives the error view', () => {
  const front = afterStart(START, 'Spanish vocabulary', { ok: true, value: CARD })
  const next = afterShowAnswer(front, { ok: false, problem: PROBLEM })

  expect(next.view).toBe('error')
  expect(next.error).toEqual(PROBLEM)
  expect(next.cardId).toBe(1001)
})

// Issue #6: grade a card.

const NEXT: Card = { cardId: 1011, question: 'la herramienta', answer: 'tool' }

function onBack(): Review {
  const loaded = afterDeckList(START, { ok: true, value: DECKS })
  const front = afterStart(loaded, 'Spanish vocabulary', { ok: true, value: CARD })

  return afterShowAnswer(front, { ok: true, value: null })
}

test('#6: the card check passes only for the card memory holds', () => {
  const back = onBack()

  expect(isSameCard(back, { ok: true, value: CARD })).toBe(true)
  expect(isSameCard(back, { ok: true, value: NEXT })).toBe(false)
  expect(isSameCard(back, { ok: true, value: null })).toBe(false)
  expect(isSameCard(back, { ok: false, problem: PROBLEM })).toBe(false)
})

test('#6: after grading, the next card front replaces the old card', () => {
  const next = afterNextCard(onBack(), { ok: true, value: NEXT })

  expect(next.view).toBe('front')
  expect(next.status).toBe('active')
  expect(next.deck).toBe('Spanish vocabulary')
  expect(next.cardId).toBe(1011)
  expect(next.front).toBe('la herramienta')
  expect(next.back).toBe('tool')
})

test('#6: when Anki is on another card, its front is shown (same rule, no grade)', () => {
  const next = afterNextCard(onBack(), { ok: true, value: NEXT })

  expect(next.view).toBe('front')
  expect(next.cardId).toBe(1011)
})

test('#6: a finished deck returns to the deck list with the finished line', () => {
  const back = onBack()
  const next = afterNextCard(back, { ok: true, value: null })

  expect(next.view).toBe('picker')
  expect(next.status).toBe('exited')
  expect(next.notice).toBe(DECK_FINISHED)
  expect(next.cardId).toBe(null)
  expect(next.decks).toEqual(DECKS)
})

test('#6: a failure while grading gives the error view and keeps the card', () => {
  const next = afterNextCard(onBack(), { ok: false, problem: PROBLEM })

  expect(next.view).toBe('error')
  expect(next.error).toEqual(PROBLEM)
  expect(next.cardId).toBe(1001)
})
