// The pane: turns what memory holds into what is drawn. It decides nothing;
// a key press is handed to the function it was given.
import type { EngineInterface } from 'claude-code'

import type { Ease, Review } from '../types'
import { isComplete } from './rules'

type Elements = ReturnType<EngineInterface['ui']['resolve']>

type PaneProps = {
  now: Review
  bodyColumns: number
  onPick: (name: string) => void
  onExit: () => void
  onShowAnswer: () => void
  onGrade: (ease: Ease) => void
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

export function drawPane({ Box, Button, Text }: Elements, { now, bodyColumns, onPick, onExit, onShowAnswer, onGrade }: PaneProps) {
  const width = Math.min(MAX_WIDTH, bodyColumns)
  const nameWidth = Math.max(8, width - KEY_WIDTH - 3 * COUNT_WIDTH - DONE.length)

  return (
    <Box flexDirection="column">
      {now.view === 'picker' && (
        <Box flexDirection="column">
          {now.notice && (
            <Box width={width} flexDirection="column">
              <Text>{now.notice}</Text>
              <Text> </Text>
            </Box>
          )}
          <Text bold>
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
                plain
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
          <Text dimColor>{now.deck}</Text>
          <Text> </Text>
          {now.front === '' ? <Text dimColor>(this card has no front)</Text> : <Text>{now.front}</Text>}
          {now.view === 'back' && (
            <Box flexDirection="column">
              <Text dimColor>{'─'.repeat(width)}</Text>
              {now.back === '' ? <Text dimColor>(this card has no back)</Text> : <Text>{now.back}</Text>}
            </Box>
          )}
          <Text> </Text>
          {now.view === 'front' ? (
            <Box>
              <Button key="show-answer" plain hotkey="s" label="[S]how answer    " onPress={onShowAnswer} />
              <Button key="exit" plain hotkey="x" label="E[x]it" onPress={onExit} />
            </Box>
          ) : (
            <Box>
              {GRADES.map(grade => (
                <Button key={grade.hotkey} plain hotkey={grade.hotkey} label={`${grade.label}   `} onPress={() => onGrade(grade.ease)} />
              ))}
            </Box>
          )}
        </Box>
      )}
      {now.view === 'error' && now.error && (
        <Box flexDirection="column">
          <Text color="error">{now.error.message}</Text>
          <Text>{now.error.fix}</Text>
        </Box>
      )}
      {/* Developer view of memory. Kept off the card views so it never shows
          an answer early; goes when the real views are done. */}
      {(now.view === 'picker' || now.view === 'error') && (
        <Box flexDirection="column">
          <Text> </Text>
          {Object.entries(now).map(([name, value]) => (
            <Text dimColor>{`${name}: ${JSON.stringify(value)}`.slice(0, width)}</Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
