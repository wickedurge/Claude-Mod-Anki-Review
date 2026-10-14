import { expect, test } from 'claude-code/testing'

import type { HttpReply, Send } from './ankiconnect'
import {
  answerOnly,
  isLeechCount,
  readCard,
  readCardState,
  readDecks,
  readDone,
  readEnvelope,
  readLeechThreshold,
  realAnki,
} from './ankiconnect'

// Issue #7: reading AnkiConnect's replies. The replies here are shaped like
// the samples in AnkiConnect's documentation; nothing contacts Anki.

const reply = (body: unknown, status = 200): HttpReply => ({ status, text: JSON.stringify(body) })
const noPause = async () => {}

test('#7: a result comes through the envelope', () => {
  expect(readEnvelope(reply({ result: ['Default'], error: null }))).toEqual({ ok: true, value: ['Default'] })
})

test('#7: an AnkiConnect error becomes a problem carrying its message', () => {
  const read = readEnvelope(reply({ result: null, error: 'deck was not found: Nope' }))

  expect(read.ok).toBe(false)
  expect(!read.ok && read.problem.message).toBe('AnkiConnect: deck was not found: Nope')
})

test('#7: an API key error points at the API key setting', () => {
  const read = readEnvelope(reply({ result: null, error: 'valid api key must be provided' }))

  expect(!read.ok && read.problem.fix).toContain('API key')
})

test('#7: a non-200 status or an unreadable body is a problem, not a crash', () => {
  expect(readEnvelope(reply({ result: 1, error: null }, 403)).ok).toBe(false)
  expect(readEnvelope({ status: 200, text: '<html>not json</html>' }).ok).toBe(false)
  expect(readEnvelope(reply({ something: 'else' })).ok).toBe(false)
})

test('#7: deck counts map New, Learn and Due (review) by deck name, in name order', () => {
  const names = ['zz-mod-test', 'Spanish']
  const stats = {
    '2': { deck_id: 2, name: 'zz-mod-test', new_count: 20, learn_count: 8, review_count: 40, total_in_deck: 68 },
    '3': { deck_id: 3, name: 'Spanish', new_count: 0, learn_count: 0, review_count: 0, total_in_deck: 5 },
  }

  expect(readDecks(names, stats)).toEqual({
    ok: true,
    value: [
      { name: 'zz-mod-test', newCount: 20, learnCount: 8, dueCount: 40 },
      { name: 'Spanish', newCount: 0, learnCount: 0, dueCount: 0 },
    ],
  })
})

test('#7: a deck the counts leave out is hidden, as Anki hides the empty Default deck', () => {
  // A real reply: getDeckStats returns nothing for an empty Default deck.
  const names = ['Default', 'zz-mod-test']
  const stats = {
    '2': { deck_id: 2, name: 'zz-mod-test', new_count: 1, learn_count: 0, review_count: 0, total_in_deck: 1 },
  }
  const read = readDecks(names, stats)

  expect(read.ok ? read.value.map(deck => deck.name) : []).toEqual(['zz-mod-test'])
})

test('#7: the answer side drops the repeated question above <hr id=answer>', () => {
  expect(answerOnly('el desarrollo<hr id=answer>development')).toBe('development')
  expect(answerOnly('q<HR id="answer" />a')).toBe('a')
  expect(answerOnly('no divider here')).toBe('no divider here')
  // As Anki sends it: the question, blank lines, the divider, the answer.
  expect(answerOnly('<style>.card {}</style>Change Control\n\n<hr id=answer>\n\nA process')).toBe('\n\nA process')
})

test('#7: a current card is read, and null means no card', () => {
  const card = { cardId: 7, question: 'q', answer: 'q<hr id=answer>a', deckName: 'zz-mod-test' }

  expect(readCard(card)).toEqual({ ok: true, value: { cardId: 7, question: 'q', answer: 'a' } })
  expect(readCard(null)).toEqual({ ok: true, value: null })
  expect(readCard({ cardId: 'seven' }).ok).toBe(false)
})

test('#7: a GUI action counts as done only when Anki answers true', () => {
  const refused = { message: 'no', fix: 'try again' }

  expect(readDone(true, refused)).toEqual({ ok: true, value: null })
  expect(readDone(false, refused)).toEqual({ ok: false, problem: refused })
})

test('#7: nothing answering at the address means Anki is not running', async () => {
  const unreachable: Send = async () => {
    throw new Error('connection refused')
  }
  const decks = await realAnki(unreachable, '', noPause).listDecks()

  expect(!decks.ok && decks.problem.message).toBe('Could not reach Anki.')
})

test('#7: requests carry version 6, and the API key only when one is set', async () => {
  const sent: unknown[] = []
  const recording: Send = async body => {
    sent.push(JSON.parse(body))
    return reply({ result: true, error: null })
  }
  await realAnki(recording, '', noPause).showAnswer()
  await realAnki(recording, 'secret', noPause).answerCard(3, 1)

  expect(sent).toEqual([
    { action: 'guiShowAnswer', version: 6, params: {} },
    { action: 'guiAnswerCard', version: 6, params: { ease: 3 }, key: 'secret' },
  ])
})

test('#7: starting a review waits briefly for Anki to put the first card up', async () => {
  let asked = 0
  const slow: Send = async body => {
    const { action } = JSON.parse(body)
    if (action === 'guiDeckReview') {
      return reply({ result: true, error: null })
    }
    asked += 1
    return reply({ result: asked < 2 ? null : { cardId: 9, question: 'q', answer: 'a' }, error: null })
  }
  const card = await realAnki(slow, '', noPause).startReview('zz-mod-test')

  expect(card).toEqual({ ok: true, value: { cardId: 9, question: 'q', answer: 'a' } })
})

// Issue #12: leeches.

test('#12: the leech rule matches Anki: the threshold, then every half-threshold', () => {
  const leeches = [...Array(21).keys()].filter(lapses => isLeechCount(lapses, 8))

  expect(leeches).toEqual([8, 12, 16, 20])
  expect(isLeechCount(5, 5)).toBe(true)
  expect(isLeechCount(8, 5)).toBe(true)
  expect(isLeechCount(7, 5)).toBe(false)
  expect(isLeechCount(3, 0)).toBe(false)
})

test('#12: card state and threshold are read from real reply shapes', () => {
  // Shaped like the real replies from zz-mod-test.
  expect(readCardState([{ cardId: 1, lapses: 2, queue: -1, deckName: 'zz-mod-test', reps: 3 }])).toEqual({
    lapses: 2,
    queue: -1,
    deckName: 'zz-mod-test',
  })
  expect(readCardState([])).toBe(null)
  expect(readLeechThreshold({ lapse: { delays: [10], leechAction: 1, leechFails: 8 } })).toBe(8)
  expect(readLeechThreshold(null)).toBe(8)
})

function leechAnki(lapses: number, suspends: boolean) {
  const actions: string[] = []
  let current = lapses
  const send: Send = async body => {
    const { action } = JSON.parse(body)
    actions.push(action)
    const result =
      action === 'cardsInfo'
        ? [{ cardId: 1, lapses: current, queue: suspends && current === 8 ? -1 : 2, deckName: 'zz-mod-test' }]
        : action === 'getDeckConfig'
          ? { lapse: { leechFails: 8 } }
          : action === 'guiAnswerCard'
            ? ((current += 1), true)
            : true
    return reply({ result, error: null })
  }

  return { actions, anki: realAnki(send, '', noPause) }
}

test('#12: Again that brings a card to 8 lapses reports a leech, suspended or not', async () => {
  expect(await leechAnki(7, false).anki.answerCard(1, 1)).toEqual({ ok: true, value: 'leech' })
  expect(await leechAnki(7, true).anki.answerCard(1, 1)).toEqual({ ok: true, value: 'suspended' })
  expect(await leechAnki(8, false).anki.answerCard(1, 1)).toEqual({ ok: true, value: 'none' })
})

test('#12: grades other than Again make no extra requests', async () => {
  const { actions, anki } = leechAnki(7, false)

  expect(await anki.answerCard(3, 1)).toEqual({ ok: true, value: 'none' })
  expect(actions).toEqual(['guiAnswerCard'])
})
