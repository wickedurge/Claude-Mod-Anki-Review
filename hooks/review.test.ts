import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

// What a test body is handed: the engine, and a way to answer for Claude Code.
type Engine = Parameters<TestBody>[0]
type On = Parameters<TestBody>[1]

// Issue #8: the whole mod as you use it, on the stub. Each test runs the
// commands, opens the pane and presses keys, then checks what is drawn.

async function openOnStub($: Engine, on: On, mode = 'on') {
  // The test stands in for Claude Code, which would open the pane.
  on('ui.open', async () => ({ value: undefined }) as never)
  await $.command.run({ command: 'anki', args: `stub ${mode}` } as never)
  await $.command.run({ command: 'anki', args: '' } as never)

  return $.ui.mount({
    plugin: 'anki-review',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'anki-review',
    props: { bodyColumns: 80 } as never,
  })
}

type Pane = Awaited<ReturnType<typeof openOnStub>>

const shows = async (ui: Pane, text: string | RegExp) => (await ui.find({ text })) !== undefined
const keys = async (ui: Pane) => (await ui.findAll({ type: 'Button' })).map(button => button.key)
const showsDebugLines = (ui: Pane) => shows(ui, /^(front|back|cardId): /)

test('#8: the deck list shows numbered decks, a complete one marked done, a long name cut short', async ($, on) => {
  const ui = await openOnStub($, on)
  const decks = await ui.findAll({ type: 'Button' })

  expect(decks).toHaveLength(7)
  expect(decks[0]?.props.hotkey).toBe('1')
  expect(decks[2]?.text).toMatch(/^Finished deck .* done$/)
  expect(decks[4]?.text).toContain('…')
  expect(decks.every(deck => deck.text.length <= 72)).toBe(true)
})

test('#8: a full review: front, answer, grade, Again sends a card back, deck finished', async ($, on) => {
  const ui = await openOnStub($, on)

  await ui.press({ key: 'Spanish vocabulary' })
  expect(await shows(ui, 'el desarrollo')).toBe(true)
  expect(await keys(ui)).toEqual(['show-answer', 'exit'])

  await ui.press({ key: 'show-answer' })
  expect(await shows(ui, 'development; growth')).toBe(true)
  expect(await keys(ui)).toEqual(['a', 'h', 'g', 'e'])

  await ui.press({ key: 'g' })
  expect(await shows(ui, 'la herramienta')).toBe(true)

  await ui.press({ key: 'show-answer' })
  await ui.press({ key: 'a' })
  expect(await shows(ui, 'aprender')).toBe(true)

  await ui.press({ key: 'show-answer' })
  await ui.press({ key: 'g' })
  expect(await shows(ui, 'la herramienta')).toBe(true)

  await ui.press({ key: 'show-answer' })
  await ui.press({ key: 'g' })
  expect(await shows(ui, 'You have finished this deck for now.')).toBe(true)
  expect(await ui.findAll({ type: 'Button' })).toHaveLength(7)
})

test('#8: the debug lines never appear on a card front or back', async ($, on) => {
  const ui = await openOnStub($, on)
  expect(await showsDebugLines(ui)).toBe(true)

  await ui.press({ key: 'Spanish vocabulary' })
  expect(await showsDebugLines(ui)).toBe(false)

  await ui.press({ key: 'show-answer' })
  expect(await showsDebugLines(ui)).toBe(false)
})

test('#8: exit on the front returns to the deck list', async ($, on) => {
  const ui = await openOnStub($, on)

  await ui.press({ key: 'Spanish vocabulary' })
  await ui.press({ key: 'exit' })
  expect(await ui.findAll({ type: 'Button' })).toHaveLength(7)
})

test('#8: a complete deck stays on the list with the nothing-due line', async ($, on) => {
  const ui = await openOnStub($, on)

  await ui.press({ key: 'Finished deck' })
  expect(await shows(ui, /^Nothing is due in this deck/)).toBe(true)
})

test('#8: awkward cards: no front, no back, image only, bad HTML', async ($, on) => {
  const ui = await openOnStub($, on)

  await ui.press({ key: 'Sample: missing front' })
  expect(await shows(ui, '(this card has no front)')).toBe(true)
  await ui.press({ key: 'exit' })

  await ui.press({ key: 'Sample: missing back' })
  await ui.press({ key: 'show-answer' })
  expect(await shows(ui, '(this card has no back)')).toBe(true)

  await $.command.run({ command: 'anki', args: '' } as never)
  await ui.press({ key: 'Languages::Spanish::Irregular verbs' })
  expect(await shows(ui, 'tener (yo, presente)\n& ir')).toBe(true)
  expect(await shows(ui, /</)).toBe(false)
  await ui.press({ key: 'exit' })

  const imageDeck = (await ui.findAll({ type: 'Button' }))[4]?.key ?? ''
  await ui.press({ key: imageDeck })
  expect(await shows(ui, '[image]')).toBe(true)
})

test('#8: the stub failing shows the error view with its fix', async ($, on) => {
  const ui = await openOnStub($, on, 'down')

  expect(await shows(ui, 'Could not reach Anki.')).toBe(true)
  expect(await shows(ui, /^Start Anki/)).toBe(true)
})
