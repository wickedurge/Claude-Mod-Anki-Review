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
  afterGrade,
  afterNextCard,
  afterShowAnswer,
  afterStart,
  afterSync,
  afterSyncStart,
  isSameCard,
  shouldTakeKeyboardBack,
} from './rules'

const PANE = 'anki-review'
const TITLE = 'Anki review'

const review = atom({ plugin: 'anki-review', key: 'review' } as const, START)
const stubMode = atom({ plugin: 'anki-review', key: 'stubMode' } as const, 'off' as StubMode)

const DEFAULT_URL = 'http://127.0.0.1:8765'

// Settings from /config, set when the mod loads.
let ankiconnectUrl = DEFAULT_URL
let ankiconnectApiKey = ''
let syncWhenFinished = false
let takeKeyboardBack = false
let showDeveloperDetails = false

// What the pane's last drawing saw. Plain variables: they start over when the
// mod reloads, and the next drawing sets them again.
let isPaneOpen = false
let hasKeyboard = false
let keyboardLosses = 0

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

  const cardId = (await read($, review)).cardId ?? 0
  const graded = await source.answerCard(ease, cardId)
  if (!graded.ok) {
    await update($, review, now => afterNextCard(now, graded))
    return
  }

  const next = await source.currentCard()
  await update($, review, now => afterGrade(now, next, graded.value))

  // The deck is finished: sync if the person asked for it in /config.
  if (syncWhenFinished && next.ok && next.value === null) {
    await update($, review, now => afterSyncStart(now))
    const synced = await source.sync()
    await update($, review, now => afterSync(now, synced))
  }
}

async function exitReview($: EngineInterface) {
  await update($, review, now => afterExit(now))
}

export const register: Register = (on, options) => {
  ankiconnectUrl = String(options.ankiconnectUrl || DEFAULT_URL)
  ankiconnectApiKey = String(options.ankiconnectApiKey || '')
  syncWhenFinished = options.syncWhenFinished === true
  takeKeyboardBack = options.takeKeyboardBack === true
  showDeveloperDetails = options.showDeveloperDetails === true

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

  // next(e) covers any permission prompt as well as the tool itself, so the
  // lines after it run once the prompt is answered and the tool is done.
  on('tool.call', async ($, e, next) => {
    const hadKeyboardAtStart = hasKeyboard
    const lossesAtStart = keyboardLosses
    const ran = await next(e)

    const takeBack = shouldTakeKeyboardBack({
      isOn: takeKeyboardBack,
      isPaneOpen,
      hadKeyboardAtStart,
      lostKeyboardDuring: keyboardLosses > lossesAtStart,
    })
    if (takeBack) {
      await $.ui.open({ id: PANE, title: TITLE, focus: true })
    }

    return ran
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      isPaneOpen = false
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const isFocused = e.props.isFocused ?? true
    if (hasKeyboard && !isFocused) {
      keyboardLosses += 1
    }
    hasKeyboard = isFocused
    isPaneOpen = true

    return drawPane($.ui.resolve(e), {
      now: await read($, review),
      bodyColumns: e.props.bodyColumns ?? 75,
      hasKeyboard: isFocused,
      showDeveloperDetails,
      onPick: name => void pickDeck($, name),
      onExit: () => void exitReview($),
      onShowAnswer: () => void showCardAnswer($),
      onGrade: ease => void gradeCard($, ease),
    })
  })
}
