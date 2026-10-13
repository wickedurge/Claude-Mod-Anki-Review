# anki-review

A Claude Code mod for reviewing Anki cards in a pane while Claude works.
Type `/anki` to open the pane.

## Status

Early development. The pane currently shows a deck picker built on made-up
sample data. It does not talk to Anki yet, and cards cannot be reviewed.

## Planned requirements

- Anki desktop, running
- The AnkiConnect add-on

## Layout

- `hooks/register.tsx`: the wiring. The only file that talks to the engine.
- `hooks/rules.ts`: what memory should hold next, given what just happened.
- `hooks/pane.tsx`: what to draw, given what memory holds.
- `hooks/ankiconnect-stub.ts`: a stand-in for Anki that returns sample decks.
- `types/index.d.ts`: the shape of the mod's memory.

## Developing

```sh
claude plugin validate .
claude --plugin-dir .
```

`/anki stub down` and `/anki stub ok` switch the stand-in between failing and
working. They are for development and will be removed.
