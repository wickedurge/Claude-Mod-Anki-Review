// The wiring: the one file that talks to the engine. It connects the
// command, the pane, memory, ankiconnect and the rules to each other.
import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Ease } from '../types'

import { answerCard, currentCard, listDecks, showAnswer, startReview } from './ankiconnect-stub'
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
const isStubDown = atom({ plugin: 'anki-review', key: 'isStubDown' } as const, false)

async function openPicker($: EngineInterface) {
  const reply = await listDecks(await read($, isStubDown))
  await update($, review, now => afterDeckList(now, reply))
}

async function pickDeck($: EngineInterface, name: string) {
  const reply = await startReview(name, await read($, isStubDown))
  await update($, review, now => afterStart(now, name, reply))
}

async function showCardAnswer($: EngineInterface) {
  const reply = await showAnswer(await read($, isStubDown))
  await update($, review, now => afterShowAnswer(now, reply))
}

async function gradeCard($: EngineInterface, ease: Ease) {
  const isDown = await read($, isStubDown)

  // Grade only the card the pane shows; if Anki has moved on, show its card instead.
  const current = await currentCard(isDown)
  if (!isSameCard(await read($, review), current)) {
    await update($, review, now => afterNextCard(now, current))
    return
  }

  const graded = await answerCard(ease, isDown)
  if (!graded.ok) {
    await update($, review, now => afterNextCard(now, graded))
    return
  }

  const next = await currentCard(isDown)
  await update($, review, now => afterNextCard(now, next))
}

async function exitReview($: EngineInterface) {
  await update($, review, now => afterExit(now))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'anki',
      description: 'Review Anki cards in a pane',
    })

    return next(e)
  })

  on('command.run', { command: 'anki' }, async ($, e) => {
    const args = e.args.trim()

    // Developer-only: switch the stub between working and failing.
    if (args === 'stub ok' || args === 'stub down') {
      await update($, isStubDown, () => args === 'stub down')

      return { text: `Stub is now ${args === 'stub down' ? 'failing' : 'working'}. Run /anki.` }
    }

    await openPicker($)
    await $.ui.open({ id: PANE, title: TITLE, focus: true })

    return { text: 'Anki review pane opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) =>
    drawPane($.ui.resolve(e), {
      now: await read($, review),
      bodyColumns: e.props.bodyColumns ?? 75,
      onPick: name => void pickDeck($, name),
      onExit: () => void exitReview($),
      onShowAnswer: () => void showCardAnswer($),
      onGrade: ease => void gradeCard($, ease),
    }),
  )
}
