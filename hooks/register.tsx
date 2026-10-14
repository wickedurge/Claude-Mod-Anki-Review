// The wiring: the one file that talks to the engine. It connects the
// command, the pane, memory, ankiconnect and the rules to each other.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Anki, Ease, StubMode } from '../types'

import { realAnki } from './ankiconnect'
import { stubAnki } from './ankiconnect-stub'
import { drawPane } from './pane'
import {
  START,
  afterDeckList,
  afterExit,
  afterNextCard,
  afterShowAnswer,
  afterStart,
  isSameCard,
} from './rules'

const PANE = 'anki-review'
const TITLE = 'Anki review'

const review = atom({ plugin: 'anki-review', key: 'review' } as const, START)
const stubMode = atom({ plugin: 'anki-review', key: 'stubMode' } as const, 'off' as StubMode)

const DEFAULT_URL = 'http://127.0.0.1:8765'

// Settings from /config, set when the mod loads.
let ankiconnectUrl = DEFAULT_URL
let ankiconnectApiKey = ''

// Real Anki, or the stub when the developer switch says so.
async function anki($: EngineInterface): Promise<Anki> {
  const mode = await read($, stubMode)
  if (mode !== 'off') {
    return stubAnki(mode === 'down')
  }

  return realAnki(
    body =>
      $.http.fetch(ankiconnectUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }),
    ankiconnectApiKey,
    ms => new Promise(done => void $.clock.after(ms, () => done())),
  )
}

async function openPicker($: EngineInterface) {
  const reply = await (await anki($)).listDecks()
  await update($, review, now => afterDeckList(now, reply))
}

async function pickDeck($: EngineInterface, name: string) {
  const reply = await (await anki($)).startReview(name)
  await update($, review, now => afterStart(now, name, reply))
}

async function showCardAnswer($: EngineInterface) {
  const reply = await (await anki($)).showAnswer()
  await update($, review, now => afterShowAnswer(now, reply))
}

async function gradeCard($: EngineInterface, ease: Ease) {
  const source = await anki($)

  // Grade only the card the pane shows; if Anki has moved on, show its card instead.
  const current = await source.currentCard()
  if (!isSameCard(await read($, review), current)) {
    await update($, review, now => afterNextCard(now, current))
    return
  }

  const graded = await source.answerCard(ease)
  if (!graded.ok) {
    await update($, review, now => afterNextCard(now, graded))
    return
  }

  const next = await source.currentCard()
  await update($, review, now => afterNextCard(now, next))
}

async function exitReview($: EngineInterface) {
  await update($, review, now => afterExit(now))
}

export const register: Register = (on, options) => {
  ankiconnectUrl = String(options.ankiconnectUrl || DEFAULT_URL)
  ankiconnectApiKey = String(options.ankiconnectApiKey || '')

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'anki',
      description: 'Review Anki cards in a pane',
    })

    return next(e)
  })

  on('command.run', { command: 'anki' }, async ($, e) => {
    const args = e.args.trim()

    // Developer-only: use the stub instead of Anki, working or failing.
    const stub = /^stub (on|off|down)$/.exec(args)
    if (stub) {
      await update($, stubMode, () => stub[1] as StubMode)
      const now = { on: 'the stub', down: 'the stub, failing', off: 'real Anki' }[stub[1] as StubMode]

      return { text: `Now using ${now}. Run /anki.` }
    }

    await openPicker($)
    await $.ui.open({ id: PANE, title: TITLE, focus: true })

    return { text: 'Anki review pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) =>
    drawPane($.ui.resolve(e), {
      now: await read($, review),
      bodyColumns: e.props.bodyColumns ?? 75,
      hasKeyboard: e.props.isFocused ?? true,
      onPick: name => void pickDeck($, name),
      onExit: () => void exitReview($),
      onShowAnswer: () => void showCardAnswer($),
      onGrade: ease => void gradeCard($, ease),
    }),
  )
}
