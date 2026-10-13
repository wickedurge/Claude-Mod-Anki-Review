export type Status = 'active' | 'paused' | 'exited'
export type View = 'picker' | 'front' | 'back' | 'error'

export type Deck = {
  name: string
  newCount: number
  learnCount: number
  dueCount: number
}

export type Problem = { message: string; fix: string }

// What every ankiconnect function hands back: the value, or what went wrong.
export type Reply<T> = { ok: true; value: T } | { ok: false; problem: Problem }

export type Review = {
  status: Status
  view: View
  decks: Deck[]
  deck: string | null
  cardId: number | null
  front: string
  back: string
  hasLeechNotice: boolean
  error: Problem | null
}

declare module 'claude-code' {
  interface PluginState {
    'anki-review': {
      review: Review
      // Developer-only: makes the stub answer as if Anki were not running.
      isStubDown: boolean
    }
  }
}
