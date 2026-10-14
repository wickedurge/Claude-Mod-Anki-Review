// The real connection to Anki, through the AnkiConnect add-on.
//
// The engine only lets register.tsx touch the network, so this file never
// does. It is handed a send function, builds each request, and reads each
// reply into the shapes the rest of the mod uses.
import type { Anki, Card, Deck, Ease, Problem, Reply } from '../types'

// What send resolves with; it rejects when nothing answers at the address.
export type HttpReply = { status: number; text: string }
export type Send = (body: string) => Promise<HttpReply>
export type Pause = (ms: number) => Promise<void>

const NOT_RUNNING: Problem = {
  message: 'Could not reach Anki.',
  fix: 'Start Anki, check the AnkiConnect add-on is installed, then run /anki.',
}

const UNREADABLE: Problem = {
  message: 'AnkiConnect sent a reply the mod could not read.',
  fix: 'Check the AnkiConnect address in /config points at AnkiConnect.',
}

// Reads AnkiConnect's envelope, { result, error }, into a Reply.
export function readEnvelope(reply: HttpReply): Reply<unknown> {
  if (reply.status !== 200) {
    return {
      ok: false,
      problem: {
        message: `AnkiConnect answered with HTTP ${reply.status}.`,
        fix: 'Check the AnkiConnect address in /config.',
      },
    }
  }
  let body: unknown
  try {
    body = JSON.parse(reply.text)
  } catch {
    return { ok: false, problem: UNREADABLE }
  }
  if (typeof body !== 'object' || body === null || !('result' in body) || !('error' in body)) {
    return { ok: false, problem: UNREADABLE }
  }
  if (typeof body.error === 'string') {
    const isKeyProblem = /api key/i.test(body.error)

    return {
      ok: false,
      problem: {
        message: `AnkiConnect: ${body.error}`,
        fix: isKeyProblem
          ? 'Set the AnkiConnect API key in /config to match the add-on.'
          : 'Check Anki is open and not showing a dialog, then try again.',
      },
    }
  }

  return { ok: true, value: body.result }
}

// deckNames gives the names; getDeckStats gives counts keyed by deck ID.
export function readDecks(names: unknown, stats: unknown): Reply<Deck[]> {
  if (!Array.isArray(names) || typeof stats !== 'object' || stats === null) {
    return { ok: false, problem: UNREADABLE }
  }
  const byName = new Map<string, Record<string, unknown>>()
  for (const one of Object.values(stats)) {
    if (typeof one === 'object' && one !== null && typeof one.name === 'string') {
      byName.set(one.name, one)
    }
  }
  const count = (value: unknown) => (typeof value === 'number' ? value : 0)

  return {
    ok: true,
    value: names
      .filter((name): name is string => typeof name === 'string')
      // Counts come from the tree Anki draws its deck list from; a deck missing
      // there (such as the empty built-in Default deck) is hidden in Anki too.
      .filter(name => byName.has(name))
      .map(name => {
        const one = byName.get(name)

        return {
          name,
          newCount: count(one?.new_count),
          learnCount: count(one?.learn_count),
          // Anki's deck list calls cards due for review "Due".
          dueCount: count(one?.review_count),
        }
      }),
  }
}

// Anki's answer side usually repeats the question above <hr id=answer>.
export function answerOnly(html: string): string {
  const parts = html.split(/<hr\s+id\s*=\s*["']?answer["']?\s*\/?>/i)

  return parts.length > 1 ? parts.slice(1).join('') : html
}

// guiCurrentCard: a card, or null when Anki is not reviewing.
export function readCard(result: unknown): Reply<Card | null> {
  if (result === null) {
    return { ok: true, value: null }
  }
  if (
    typeof result !== 'object' ||
    typeof (result as Record<string, unknown>).cardId !== 'number' ||
    typeof (result as Record<string, unknown>).question !== 'string' ||
    typeof (result as Record<string, unknown>).answer !== 'string'
  ) {
    return { ok: false, problem: UNREADABLE }
  }
  const card = result as { cardId: number; question: string; answer: string }

  return {
    ok: true,
    value: { cardId: card.cardId, question: card.question, answer: answerOnly(card.answer) },
  }
}

// The GUI actions answer true when Anki did what was asked.
export function readDone(result: unknown, refused: Problem): Reply<null> {
  return result === true ? { ok: true, value: null } : { ok: false, problem: refused }
}

export function realAnki(send: Send, apiKey: string, pause: Pause): Anki {
  async function call(action: string, params: object = {}): Promise<Reply<unknown>> {
    const request = { action, version: 6, params, ...(apiKey ? { key: apiKey } : {}) }
    let reply: HttpReply
    try {
      reply = await send(JSON.stringify(request))
    } catch {
      return { ok: false, problem: NOT_RUNNING }
    }

    return readEnvelope(reply)
  }

  async function currentCard(): Promise<Reply<Card | null>> {
    const reply = await call('guiCurrentCard')

    return reply.ok ? readCard(reply.value) : reply
  }

  return {
    async listDecks() {
      const names = await call('deckNames')
      if (!names.ok) {
        return names
      }
      const stats = await call('getDeckStats', { decks: names.value })
      if (!stats.ok) {
        return stats
      }

      return readDecks(names.value, stats.value)
    },

    async startReview(deckName: string) {
      const started = await call('guiDeckReview', { name: deckName })
      if (!started.ok) {
        return started
      }
      const done = readDone(started.value, {
        message: `Anki would not open the deck "${deckName}".`,
        fix: 'Check the deck still exists in Anki, then run /anki.',
      })
      if (!done.ok) {
        return done
      }
      // Anki can take a moment to put the first card up after opening a deck.
      let card = await currentCard()
      for (let tries = 0; tries < 3 && card.ok && card.value === null; tries++) {
        await pause(150)
        card = await currentCard()
      }

      return card
    },

    currentCard,

    async showAnswer() {
      const reply = await call('guiShowAnswer')

      return reply.ok
        ? readDone(reply.value, {
            message: 'Anki would not show the answer.',
            fix: 'Check Anki is on the review screen, then run /anki.',
          })
        : reply
    },

    async answerCard(ease: Ease) {
      const reply = await call('guiAnswerCard', { ease })

      return reply.ok
        ? readDone(reply.value, {
            message: 'Anki would not take the grade.',
            fix: 'Check Anki is showing the answer, then run /anki.',
          })
        : reply
    },
  }
}
