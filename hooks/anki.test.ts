import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

// What a test body is handed: the engine, and a way to answer for Claude Code.
type Engine = Parameters<TestBody>[0]
type On = Parameters<TestBody>[1]

// Issue #8: the mod against a fake AnkiConnect. The test answers the mod's
// web requests itself, so the real connection code runs without Anki.

type FakeCard = { cardId: number; question: string; answer: string }

// A small AnkiConnect: one deck, a queue of cards, and a log of actions.
function fakeAnki(cards: FakeCard[], syncError: string | null = null) {
  const fake = { queue: [...cards], actions: [] as string[] }

  const answer = (action: string, params: Record<string, unknown>): unknown => {
    switch (action) {
      case 'deckNames':
        return ['zz-mod-test']
      case 'getDeckStats':
        return { '2': { deck_id: 2, name: 'zz-mod-test', new_count: fake.queue.length, learn_count: 0, review_count: 0, total_in_deck: fake.queue.length } }
      case 'guiDeckReview':
      case 'guiShowAnswer':
        return true
      case 'guiCurrentCard': {
        const card = fake.queue[0]
        return card ? { ...card, answer: `${card.question}<hr id=answer>${card.answer}` } : null
      }
      case 'guiAnswerCard':
        fake.queue = params.ease === 1 ? [...fake.queue.slice(1), fake.queue[0]!] : fake.queue.slice(1)
        return true
      default:
        return null
    }
  }

  return {
    fake,
    reply(body: string) {
      const { action, params } = JSON.parse(body)
      fake.actions.push(action)
      // Real Anki answers guiCurrentCard with an error, not null, once it has
      // left the review screen; the documentation says null.
      const notReviewing = action === 'guiCurrentCard' && fake.queue.length === 0
      const error = notReviewing ? 'Gui review is not currently active.' : action === 'sync' ? syncError : null
      return { status: 200, ok: true, headers: {}, text: JSON.stringify({ result: answer(action, params ?? {}), error }) }
    },
  }
}

const CARDS: FakeCard[] = [
  { cardId: 1, question: '<style>.card {}</style>Change Control', answer: 'A process for changes' },
  { cardId: 2, question: 'Baseline', answer: 'The approved version' },
]

async function openOnFake($: Engine, on: On, anki: ReturnType<typeof fakeAnki> | 'down') {
  on('ui.open', async () => ({ value: undefined }) as never)
  on('http.fetch', async (_$, e) => {
    if (anki === 'down') {
      throw new Error('connection refused')
    }
    return { value: anki.reply(String(e.init?.body)) } as never
  })
  await $.command.run({ command: 'anki', args: 'stub off' } as never)
  await $.command.run({ command: 'anki', args: '' } as never)

  return $.ui.mount({
    plugin: 'anki-review',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'anki-review',
    props: { bodyColumns: 80 } as never,
  })
}

type Pane = Awaited<ReturnType<typeof openOnFake>>
const shows = async (ui: Pane, text: string | RegExp) => (await ui.find({ text })) !== undefined

test('#8: a full review through the real connection code', async ($, on) => {
  const anki = fakeAnki(CARDS)
  const ui = await openOnFake($, on, anki)

  expect(await shows(ui, /^zz-mod-test +2 +0 +0$/)).toBe(true)
  await ui.press({ key: 'zz-mod-test' })
  expect(await shows(ui, 'Change Control')).toBe(true)
  expect(await shows(ui, /\.card/)).toBe(false)

  await ui.press({ key: 'show-answer' })
  expect(await shows(ui, 'A process for changes')).toBe(true)

  await ui.press({ key: 'g' })
  expect(await shows(ui, 'Baseline')).toBe(true)
  expect(anki.fake.actions).toContain('guiAnswerCard')
})

test('#8: when Anki has moved to another card, the mod shows it and sends no grade', async ($, on) => {
  const anki = fakeAnki(CARDS)
  const ui = await openOnFake($, on, anki)
  await ui.press({ key: 'zz-mod-test' })
  await ui.press({ key: 'show-answer' })

  // Someone answers the card in Anki itself while the pane shows its back.
  anki.fake.queue = anki.fake.queue.slice(1)
  await ui.press({ key: 'g' })

  expect(await shows(ui, 'Baseline')).toBe(true)
  expect(anki.fake.actions).not.toContain('guiAnswerCard')
})

test('#8: nothing answering at the address shows the error view', async ($, on) => {
  const ui = await openOnFake($, on, 'down')

  expect(await shows(ui, 'Could not reach Anki.')).toBe(true)
})

// Issue #13: sync with AnkiWeb when a deck is finished.

async function finishDeck(ui: Pane) {
  await ui.press({ key: 'zz-mod-test' })
  for (const _card of CARDS) {
    await ui.press({ key: 'show-answer' })
    await ui.press({ key: 'g' })
  }
}

test('#13: with the setting off, finishing a deck sends no sync', async ($, on) => {
  const anki = fakeAnki(CARDS)
  const ui = await openOnFake($, on, anki)
  await finishDeck(ui)

  expect(await shows(ui, 'You have finished this deck for now.')).toBe(true)
  expect(anki.fake.actions).not.toContain('sync')
})

test('#13: with the setting on, finishing a deck syncs once and says so', { options: { syncWhenFinished: true } }, async ($, on) => {
  const anki = fakeAnki(CARDS)
  const ui = await openOnFake($, on, anki)
  await finishDeck(ui)

  expect(await shows(ui, 'You have finished this deck for now. Synced with AnkiWeb.')).toBe(true)
  expect(anki.fake.actions.filter(action => action === 'sync')).toHaveLength(1)
})

test('#13: a failed sync gives its reason and leaves the deck list usable', { options: { syncWhenFinished: true } }, async ($, on) => {
  const anki = fakeAnki(CARDS, 'sync: auth required')
  const ui = await openOnFake($, on, anki)
  await finishDeck(ui)

  expect(await shows(ui, /Could not sync: AnkiConnect: sync: auth required$/)).toBe(true)
  expect(await ui.find({ key: 'zz-mod-test' })).toBeDefined()
})
