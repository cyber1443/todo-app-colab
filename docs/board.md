# The board

A trello-style board: cards sit in ordered columns, and moving a card between or
within columns is the only way its position changes.

The shared types, the default columns and the error codes live in
`src/lib/board/contract.js`. The store's behaviour is written down in
`src/lib/board/spec.js`, and the text format primitives in
`src/components/board/format.js`. This document describes those three files; when
they and this document disagree, they win, and `docs/board.test.js` fails.

## Columns

A column is `{ id, title }`. The id is stable and kebab-case, and is the key a
snapshot files cards under. The title is the human label the renderer prints.

A board built with no columns of its own starts with three:

| id      | title  |
| ------- | ------ |
| `todo`  | To Do  |
| `doing` | Doing  |
| `done`  | Done   |

Columns are held in display order, top to bottom.

## Cards

A card is `{ id, title, columnId }`. The id is unique across the whole board and
opaque: it is allocated by `nextCardId()` and must never be parsed. `columnId` is
the column the card currently sits in, so a card always knows where it is filed.

Tests that assert on exact ids call `resetCardIds()` first, because the counter
is shared across the process.

## Snapshots

`snapshot()` returns a `BoardSnapshot`:

```js
{
  columns: [ { id: 'todo', title: 'To Do' }, ... ],   // display order
  cardsByColumn: {
    todo: [ { id: 'card-1', title: 'try session-share', columnId: 'todo' } ],
    doing: [],                                        // empty, never missing
    done: [],
  },
}
```

There is exactly one `cardsByColumn` entry per column, an empty array when the
column holds no cards and never a missing key. Each array is in display order
with index 0 at the top, and every card in it carries that column's id.

Snapshots are copies. Mutating a returned snapshot, card or array never changes
the board, so a caller can hand one around freely.

`assertSnapshotShape(snapshot)` in `src/lib/board/spec.js` checks all of this and
throws a `TypeError` when it does not hold.

## Store operations

`createBoard(columns)` returns a store with four methods:
`snapshot`, `addCard`, `moveCard` and `removeCard`. `assertBoardApi(board)`
checks that all four are present.

Bad input throws a `BoardError` carrying a `code`:

| code             | constant              | meaning                                |
| ---------------- | --------------------- | -------------------------------------- |
| `unknown-column` | `ERR_UNKNOWN_COLUMN`  | no column on the board has that id     |
| `unknown-card`   | `ERR_UNKNOWN_CARD`    | no card on the board has that id       |

### `snapshot()` -> BoardSnapshot

The whole board, as described above. Never throws.

### `addCard(columnId, title)` -> Card

Appends a new card to the **bottom** of that column, with an id from
`nextCardId()`. Throws `unknown-column` when the column does not exist.

### `moveCard(cardId, toColumnId, toIndex)` -> Card

Lifts the card out of its current column, then inserts it into `toColumnId` at
`toIndex`, where index 0 is the top.

- `toIndex` is optional, and defaults to the bottom of the target column.
- An index past the end clamps to the bottom.
- A negative index clamps to the top.
- A move within one column is a reorder, and the target position is computed
  **after** the card has been lifted out. In a column of `[a, b, c]`, moving `a`
  to index 2 gives `[b, c, a]`, because the index applies to the remaining
  `[b, c]`.

Throws `unknown-card` for a card that is not on the board, and `unknown-column`
for a target column that does not exist.

### `removeCard(cardId)` -> boolean

True when a card was removed, false when the id was not on the board. Never
throws, so removing the same id twice gives `true` then `false`.

## The text format

`renderBoard(snapshot)` prints one section per column, in `snapshot.columns`
order. A section is a header line followed by one line per card:

- header: `== <title> (<card count>) ==`
- card: `- <id> <title>`

A column with no cards renders as the single line `(empty)` under its header. A
board with no columns at all renders as `Empty board.`. Sections are separated by
a blank line, and the output never ends with a trailing newline.

Worked example, for the board `npm start` builds:

```
== To Do (2) ==
- card-1 try session-share
- card-2 split this app between two people

== Doing (1) ==
- card-4 wire the board into the CLI

== Done (1) ==
- card-3 land the contract
```

`card-3` was added to `todo` and then moved to `done` at index 0, which is why
its number is out of step with its position. Ids record when a card was created,
not where it sits.

Nothing constructs these strings by hand. The renderer, the CLI test and this
document all go through `columnHeader`, `cardLine`, `EMPTY_COLUMN_LINE` and
`EMPTY_BOARD_LINE` in `src/components/board/format.js`, so the format is defined
in one place.

## Running the demo

```sh
npm start     # build a board, seed it, move a card, print it
npm test      # the whole suite, this document's checks included
```
