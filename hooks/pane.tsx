// The pane: turns what memory holds into what is drawn. It decides nothing;
// a key press is handed to the function it was given.
import type { EngineInterface } from 'claude-code'

import type { Ease, Review } from '../types'
import { isComplete } from './rules'

type Elements = ReturnType<EngineInterface['ui']['resolve']>

type PaneProps = {
  now: Review
  bodyColumns: number
  // Whether the person has given the pane the keyboard.
  hasKeyboard: boolean
  onPick: (name: string) => void
  onExit: () => void
  onShowAnswer: () => void
  onGrade: (ease: Ease) => void
}

const LEECH_NOTICE = {
  none: '',
  leech: 'That card is now a leech.',
  suspended: 'That card is now a leech. It has been suspended.',
}

const MAX_WIDTH = 75
const KEY_WIDTH = 3 // the engine draws a hotkey as "1: "
const COUNT_WIDTH = 6
const DONE = '  done'

const GRADES: { hotkey: string; label: string; ease: Ease }[] = [
  { hotkey: 'a', label: '[A]gain', ease: 1 },
  { hotkey: 'h', label: '[H]ard', ease: 2 },
  { hotkey: 'g', label: '[G]ood', ease: 3 },
  { hotkey: 'e', label: '[E]asy', ease: 4 },
]

function fit(text: string, width: number) {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text.padEnd(width)
}

function counts(a: string | number, b: string | number, c: string | number) {
  return [a, b, c].map(one => String(one).padStart(COUNT_WIDTH)).join('')
}

export function drawPane({ Box, Button, Text }: Elements, { now, bodyColumns, hasKeyboard, onPick, onExit, onShowAnswer, onGrade }: PaneProps) {
  const width = Math.min(MAX_WIDTH, bodyColumns)
  const nameWidth = Math.max(8, width - KEY_WIDTH - 3 * COUNT_WIDTH - DONE.length)
  // Everything dims while the keyboard is elsewhere, so it is clear where it is.
  const dim = !hasKeyboard

  return (
    <Box flexDirection="column">
      {!hasKeyboard && (
        <Box flexDirection="column">
          <Text dimColor>ctrl+x then tab to review here</Text>
          <Text dimColor={dim}> </Text>
        </Box>
      )}
      {now.view === 'picker' && (
        <Box flexDirection="column">
          {now.notice && (
            <Box width={width} flexDirection="column">
              <Text dimColor={dim}>{now.notice}</Text>
              <Text dimColor={dim}> </Text>
            </Box>
          )}
          {now.leech !== 'none' && (
            <Box width={width} flexDirection="column">
              <Text color="warning" dimColor={dim}>{LEECH_NOTICE[now.leech]}</Text>
              <Text dimColor={dim}> </Text>
            </Box>
          )}
          <Text bold dimColor={dim}>
            {' '.repeat(KEY_WIDTH)}
            {fit('Deck', nameWidth)}
            {counts('New', 'Learn', 'Due')}
          </Text>
          {now.decks.length === 0 && <Text dimColor>No decks loaded.</Text>}
          {now.decks.map((deck, i) => {
            const row = `${fit(deck.name, nameWidth)}${counts(deck.newCount, deck.learnCount, deck.dueCount)}${isComplete(deck) ? DONE : ''}`
            const hotkey = i < 9 ? String(i + 1) : undefined

            return (
              <Button
                key={deck.name}
                plain dimColor={dim}
                hotkey={hotkey}
                label={hotkey ? row : `${' '.repeat(KEY_WIDTH)}${row}`}
                onPress={() => onPick(deck.name)}
              />
            )
          })}
        </Box>
      )}
      {(now.view === 'front' || now.view === 'back') && (
        <Box width={width} flexDirection="column">
          {now.leech !== 'none' && (
            <Box flexDirection="column">
              <Text color="warning" dimColor={dim}>{LEECH_NOTICE[now.leech]}</Text>
              <Text dimColor={dim}> </Text>
            </Box>
          )}
          <Text dimColor>{now.deck}</Text>
          <Text dimColor={dim}> </Text>
          {now.front === '' ? <Text dimColor>(this card has no front)</Text> : <Text dimColor={dim}>{now.front}</Text>}
          {now.view === 'back' && (
            <Box flexDirection="column">
              <Text dimColor>{'─'.repeat(width)}</Text>
              {now.back === '' ? <Text dimColor>(this card has no back)</Text> : <Text dimColor={dim}>{now.back}</Text>}
            </Box>
          )}
          <Text dimColor={dim}> </Text>
          {now.view === 'front' ? (
            <Box>
              <Button key="show-answer" plain dimColor={dim} hotkey="s" label="[S]how answer    " onPress={onShowAnswer} />
              <Button key="exit" plain dimColor={dim} hotkey="x" label="E[x]it" onPress={onExit} />
            </Box>
          ) : (
            <Box>
              {GRADES.map(grade => (
                <Button key={grade.hotkey} plain dimColor={dim} hotkey={grade.hotkey} label={`${grade.label}   `} onPress={() => onGrade(grade.ease)} />
              ))}
            </Box>
          )}
        </Box>
      )}
      {now.view === 'error' && now.error && (
        <Box flexDirection="column">
          <Text color="error" dimColor={dim}>{now.error.message}</Text>
          <Text dimColor={dim}>{now.error.fix}</Text>
        </Box>
      )}
      {/* Developer view of memory. Kept off the card views so it never shows
          an answer early; goes when the real views are done. */}
      {(now.view === 'picker' || now.view === 'error') && (
        <Box flexDirection="column">
          <Text dimColor={dim}> </Text>
          {Object.entries(now).map(([name, value]) => (
            <Text dimColor>{`${name}: ${JSON.stringify(value)}`.slice(0, width)}</Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
