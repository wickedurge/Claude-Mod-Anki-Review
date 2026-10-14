import { expect, test } from 'claude-code/testing'
import type { Mounted, TestBody } from 'claude-code/testing'

import { shouldTakeKeyboardBack } from './rules'

type Engine = Parameters<TestBody>[0]
type On = Parameters<TestBody>[1]

// Issue #14: take the keyboard back after a permission prompt.

test('#14: the keyboard is taken back only when all four conditions hold', () => {
  const all = { isOn: true, isPaneOpen: true, hadKeyboardAtStart: true, lostKeyboardDuring: true }

  expect(shouldTakeKeyboardBack(all)).toBe(true)
  for (const name of Object.keys(all) as (keyof typeof all)[]) {
    expect(shouldTakeKeyboardBack({ ...all, [name]: false })).toBe(false)
  }
})

// Opens the pane on the stub, then plays one tool call. When the prompt
// takes the keyboard, the pane is drawn without it partway through the call,
// as a permission prompt does. Returns every request to open the pane made
// after the pane was first drawn.
async function playToolCall($: Engine, on: On, hadKeyboard: boolean, promptTakesKeyboard: boolean) {
  // The test's stand-ins for Claude Code are registered before anything runs.
  const opens: unknown[] = []
  on('ui.open', async (_$, e) => {
    opens.push(e)
    return { value: undefined } as never
  })
  let pane: Mounted<'terminal', 'Pane'> | undefined
  const props = (isFocused: boolean) => ({ bodyColumns: 80, isFocused }) as never
  on('tool.call', async () => {
    if (promptTakesKeyboard) {
      await pane?.redraw(props(false))
    }
    return { result: { text: 'done' } } as never
  })

  await $.command.run({ command: 'anki', args: 'stub on' } as never)
  await $.command.run({ command: 'anki', args: '' } as never)
  pane = await $.ui.mount({
    plugin: 'anki-review',
    surface: 'terminal',
    component: 'Pane',
    requestId: 'anki-review',
    props: props(hadKeyboard),
  })
  opens.length = 0
  await $.tool.call({ tool: 'Bash', input: { command: 'ls' }, tool_use_id: 'call-1' } as never)

  return opens
}

const askedForKeyboard = (opens: unknown[]) =>
  opens.some(open => (open as { focus?: boolean }).focus === true)

test('#14: on: a prompt that takes the keyboard mid-call gets it handed back', { options: { takeKeyboardBack: true } }, async ($, on) => {
  const opens = await playToolCall($, on, true, true)

  expect(askedForKeyboard(opens)).toBe(true)
})

test('#14: on: a call that never took the keyboard asks for nothing', { options: { takeKeyboardBack: true } }, async ($, on) => {
  const opens = await playToolCall($, on, true, false)

  expect(opens).toHaveLength(0)
})

test('#14: on: a pane that did not have the keyboard at the start asks for nothing', { options: { takeKeyboardBack: true } }, async ($, on) => {
  const opens = await playToolCall($, on, false, true)

  expect(opens).toHaveLength(0)
})

test('#14: off: the keyboard is never asked for after a call', async ($, on) => {
  const opens = await playToolCall($, on, true, true)

  expect(opens).toHaveLength(0)
})
