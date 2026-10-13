import { expect, test } from 'claude-code/testing'

import type { Deck, Problem, Review } from '../types'
import { START, afterDeckList, afterPick, isComplete } from './rules'

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

test('AC6: picking a deck records its name and changes nothing else', () => {
  const loaded = afterDeckList(START, { ok: true, value: DECKS })
  const next = afterPick(loaded, 'Spanish vocabulary')

  expect(next.deck).toBe('Spanish vocabulary')
  expect(next).toEqual({ ...loaded, deck: 'Spanish vocabulary' })
})
