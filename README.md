# anki-review

[![Checks](https://github.com/wickedurge/Claude-Mod-Anki-Review/actions/workflows/checks.yml/badge.svg)](https://github.com/wickedurge/Claude-Mod-Anki-Review/actions/workflows/checks.yml)

Review your Anki flashcards in a pane inside Claude Code while Claude works.

When Claude is busy on a long task, you usually wait. This mod turns that
waiting time into study time: type `/anki`, pick a deck, and review cards with
single keys. Every review goes into Anki itself, so your scheduling and
statistics stay exactly as if you had used Anki's own window.

```
   Deck                              New Learn   Due
1: Spanish vocabulary                 11     7     0
2: TypeScript terms                    0     0    78
3: Finished deck                       0     0     0  done
```

## Requirements

- **Anki desktop**, running while you review. Get it from
  [apps.ankiweb.net](https://apps.ankiweb.net).
- **The AnkiConnect add-on.** In Anki, choose Tools, Add-ons, Get Add-ons, and
  enter the code `2055492159`. Restart Anki afterwards.
- **Claude Code** with mod support. Tested on version 2.1.287.
- **An AnkiWeb account** only if you want the optional sync.

## Install

Clone the repository into Claude Code's skills folder:

```sh
git clone https://github.com/wickedurge/Claude-Mod-Anki-Review.git ~/.claude/skills/anki-review
```

Then start a new Claude Code session. Claude Code loads the mod from that
folder by itself.

To update later, run `git pull` in `~/.claude/skills/anki-review` and start a
new session.

## Use

1. Start Anki.
2. In Claude Code, type `/anki`. A pane opens with your decks and their New,
   Learn and Due counts, as Anki shows them.
3. Press a deck's number, or move with the arrow keys and press Enter.
4. Review with these keys:

| On | Key | Does |
| --- | --- | --- |
| A card's front | `s` | Show the answer |
| A card's front | `x` | Exit to the deck list |
| A card's back | `a` | Again |
| A card's back | `h` | Hard |
| A card's back | `g` | Good |
| A card's back | `e` | Easy |

When a deck is finished, the pane returns to the deck list.

### Moving between the pane and the prompt

The pane and Claude's prompt box share one keyboard.

- **Esc** sends the keyboard back to the prompt, so you can talk to Claude.
- **`ctrl+x` then `tab`** moves the keyboard into the pane. Clicking the pane
  works too.
- **`ctrl+x` then `x`** closes the pane.

The pane dims while the keyboard is elsewhere and shows
`ctrl+x then tab to review here` at the top, so you can always tell where your
keys will go.

Tip: run `/anki` before you give Claude a long task. Commands typed while Claude
is working wait until it finishes.

### What the pane tells you

- **Leeches.** When pressing Again turns a card into a leech, the next card
  says so, and adds that the card was suspended if your deck suspends leeches.
- **Nothing due.** Picking a finished deck says so. To study more, use Custom
  Study in Anki; the session deck it creates then appears in the list.
- **Errors.** If Anki is not running or AnkiConnect answers with an error, the
  pane says what went wrong and what to do. Run `/anki` again once it is fixed.

## Settings

Open `/config` and find anki-review:

| Setting | Default | What it does |
| --- | --- | --- |
| AnkiConnect address | `http://127.0.0.1:8765` | Where the AnkiConnect add-on listens. |
| AnkiConnect API key | empty | Only needed if you set an `apiKey` in AnkiConnect's config. Stored securely. |
| Sync with AnkiWeb when a deck is finished | off | After a deck's last card, asks Anki to sync so your reviews reach your other devices. |
| Take the keyboard back after a permission prompt | off | If a permission prompt takes the keyboard from the pane mid-review, gives it back once you answer the prompt. |
| Show developer details | off | Prints the mod's memory under the pane, for working on the mod. It shows answers early. |

The settings live in Claude Code's own settings file, so they travel with the
rest of your Claude Code settings.

## How it works

The mod sends requests to the AnkiConnect add-on on your computer. When you
pick a deck, Anki opens it in its own review screen, and the pane shows the
same card. Showing the answer and grading happen in Anki too, so Anki stays
the single source of truth. Before grading, the mod checks that Anki is still
on the card the pane shows, so a grade never lands on the wrong card.

Nothing leaves your computer except an optional AnkiWeb sync, which Anki
performs itself.

## Development

```sh
git clone https://github.com/wickedurge/Claude-Mod-Anki-Review.git
cd Claude-Mod-Anki-Review
claude plugin validate .
claude plugin test .
claude --plugin-dir .
```

- `hooks/register.tsx`: the wiring. The only file that talks to Claude Code.
- `hooks/rules.ts`: what memory should hold next, given what just happened.
- `hooks/pane.tsx`: what to draw, given what memory holds.
- `hooks/text.ts`: turns a card's HTML into plain text.
- `hooks/ankiconnect.ts`: requests to AnkiConnect and reading its replies.
- `hooks/ankiconnect-stub.ts`: a stand-in for Anki with sample decks and cards.
- `hooks/*.test.ts`: tests. `review.test.ts` drives the pane on the stand-in;
  `anki.test.ts` drives it against a fake AnkiConnect.
- `types/index.d.ts`: the shape of the mod's memory.

`claude plugin test .` runs every test without Anki or an open pane. GitHub
runs the validator, the tests and a type check on every push
(`.github/workflows/checks.yml`).

`/anki stub on` switches to the stand-in, which has sample cards for awkward
cases: no front, no back, broken HTML, images, long text and a leech.
`/anki stub down` makes it fail as if Anki were not running, and
`/anki stub off` returns to Anki.

## Licence

MIT. See [LICENSE](LICENSE).
