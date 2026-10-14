# anki-review

A Claude Code mod for reviewing Anki cards in a pane while Claude works.
Type `/anki` to open the pane.

## Status

Early development. The pane shows a deck picker and the front of a card,
built on made-up sample data. It does not talk to Anki yet, and cards cannot
be answered or graded.

## Planned requirements

- Anki desktop, running
- The AnkiConnect add-on

## Layout

- `hooks/register.tsx`: the wiring. The only file that talks to the engine.
- `hooks/rules.ts`: what memory should hold next, given what just happened.
- `hooks/pane.tsx`: what to draw, given what memory holds.
- `hooks/text.ts`: turns a card's HTML into plain text.
- `hooks/*.test.ts`: tests for the rules and the text conversion.
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
rules and the text conversion, and need neither Anki nor an open pane.

`/anki stub down` and `/anki stub ok` switch the stand-in between failing and
working. They are for development and will be removed.
