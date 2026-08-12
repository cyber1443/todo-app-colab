/**
 * Primitives for the board's plain-text format.
 *
 * `src/components/board/render.js` (task board-render) must export
 * `renderBoard(snapshot)` built from exactly these pieces: one section per
 * column in `snapshot.columns` order, sections joined by a blank line, no
 * trailing newline. A column with no cards is the single line
 * EMPTY_COLUMN_LINE. A board with no columns is EMPTY_BOARD_LINE.
 *
 *     == To Do (2) ==
 *     - card-1 try session-share
 *     - card-2 split this app
 *
 *     == Doing (0) ==
 *     (empty)
 */

/** Rendered for a column that has no cards. */
const EMPTY_COLUMN_LINE = '(empty)'

/** Rendered for a board that has no columns at all. */
const EMPTY_BOARD_LINE = 'Empty board.'

/** Separates one column section from the next. */
const SECTION_SEPARATOR = '\n\n'

/**
 * @param {import('../../lib/board/contract.js').Column} column
 * @param {number} cardCount
 * @returns {string}
 */
function columnHeader(column, cardCount) {
  return `== ${column.title} (${cardCount}) ==`
}

/**
 * @param {import('../../lib/board/contract.js').Card} card
 * @returns {string}
 */
function cardLine(card) {
  return `- ${card.id} ${card.title}`
}

module.exports = {
  EMPTY_COLUMN_LINE,
  EMPTY_BOARD_LINE,
  SECTION_SEPARATOR,
  columnHeader,
  cardLine,
}
