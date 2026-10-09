/**
 * Shared contract for the Trello-style board. Frozen: do not edit inside a task.
 *
 * @typedef {'todo' | 'doing' | 'done'} ColumnId
 *
 * @typedef {Object} Card
 * @property {number} id
 * @property {string} title
 * @property {ColumnId} column
 *
 * @typedef {Object} Column
 * @property {ColumnId} id
 * @property {string} title   Display title, from COLUMN_TITLES
 * @property {Card[]} cards   In insertion/move order; a moved card goes to the end
 *
 * @typedef {Object} Board
 * @property {Column[]} columns  Always all of COLUMNS, in COLUMNS order, even when empty
 *
 * Store API (task board-store, src/lib/board.js):
 *   module.exports = { createBoard }
 *   createBoard() -> independent board; card ids start at 1 per board.
 *     addCard(title, column = 'todo') -> Card. Throws on unknown column or empty/blank title.
 *     moveCard(id, to) -> Card | null. null for unknown id; throws on unknown column; appends to target.
 *     removeCard(id) -> boolean.
 *     snapshot() -> Board, deep copy; mutating it never changes the board.
 *
 * Renderer API (task board-render, src/components/board/render.js):
 *   module.exports = { renderBoard }
 *   renderBoard(board: Board) -> string. One block per column in board.columns order,
 *   blocks joined by one blank line, no trailing newline:
 *     == To Do (2) ==
 *     - #1 first card
 *     - #3 another
 *   An empty column renders its header followed by the line "  (empty)".
 */

/** Column ids in display order. */
const COLUMNS = Object.freeze(['todo', 'doing', 'done'])

/** Display title per column id. */
const COLUMN_TITLES = Object.freeze({ todo: 'To Do', doing: 'Doing', done: 'Done' })

function isColumn(value) {
  return COLUMNS.includes(value)
}

module.exports = { COLUMNS, COLUMN_TITLES, isColumn }
