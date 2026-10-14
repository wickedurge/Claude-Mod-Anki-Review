# anki-review

A Claude Code mod for reviewing Anki cards in a pane while Claude works.
Type `/anki` to open the pane.

## Status

Early development. The pane lists your Anki decks, shows a card's front and
back, and grades it, through the AnkiConnect add-on.

## Requirements

- Anki desktop, running
- The AnkiConnect add-on

## Layout

- `hooks/register.tsx`: the wiring. The only file that talks to the engine.
- `hooks/rules.ts`: what memory should hold next, given what just happened.
- `hooks/pane.tsx`: what to draw, given what memory holds.
- `hooks/text.ts`: turns a card's HTML into plain text.
- `hooks/*.test.ts`: tests. `review.test.ts` drives the pane on the stand-in;
  `anki.test.ts` drives it against a fake AnkiConnect.
- `hooks/ankiconnect.ts`: requests to AnkiConnect and reading its replies.
- `hooks/ankiconnect-stub.ts`: a stand-in for Anki that returns sample decks
  and cards.
- `types/index.d.ts`: the shape of the mod's memory.

## Developing

```sh
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

`claude plugin test .` runs the tests in `hooks/*.test.ts`. They cover the
rules, the text conversion, reading AnkiConnect's replies, and the pane as you
use it: commands run, keys pressed, and what is drawn checked. None of them
needs Anki or an open terminal pane.

`/anki stub on` uses the stand-in instead of Anki, `/anki stub down` makes it
fail as if Anki were not running, and `/anki stub off` returns to Anki.

## Settings

In `/config`: the AnkiConnect address (default `http://127.0.0.1:8765`) and an
optional API key, needed only if one is set in AnkiConnect's config.
