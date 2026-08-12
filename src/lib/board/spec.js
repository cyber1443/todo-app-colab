/**
 * The store's public surface, written down so it can be checked.
 *
 * `src/lib/board/store.js` (task board-store) must export `createBoard(columns?)`
 * returning an object that satisfies `assertBoardApi`, whose `snapshot()`
 * satisfies `assertSnapshotShape`. Behaviour the shape cannot capture:
 *
 * - `addCard(columnId, title)` -> Card. Appends to the BOTTOM of that column
 *   with an id from `nextCardId()`. Throws BoardError(ERR_UNKNOWN_COLUMN) when
 *   the column does not exist.
 * - `moveCard(cardId, toColumnId, toIndex)` -> Card. Lifts the card out of its
 *   current column, then inserts it into `toColumnId` at `toIndex`, where index
 *   0 is the top. `toIndex` is optional and defaults to the bottom of the
 *   target column. An index past the end clamps to the bottom, a negative index
 *   clamps to the top. A move within one column is a reorder, with the target
 *   position computed AFTER the card has been lifted out. Throws
 *   BoardError(ERR_UNKNOWN_CARD) for an unknown card, and
 *   BoardError(ERR_UNKNOWN_COLUMN) for an unknown target column.
 * - `removeCard(cardId)` -> boolean. True when a card was removed, false when
 *   the id was not on the board. Never throws.
 * - Every getter returns copies: mutating a returned snapshot, card, or array
 *   must never change the board.
 */

const BOARD_METHODS = ['snapshot', 'addCard', 'moveCard', 'removeCard']

/**
 * Throws a TypeError unless `board` looks like a store built by createBoard.
 * @param {unknown} board
 * @returns {void}
 */
function assertBoardApi(board) {
  if (!board || typeof board !== 'object') {
    throw new TypeError('board: expected an object')
  }
  for (const method of BOARD_METHODS) {
    if (typeof board[method] !== 'function') {
      throw new TypeError(`board.${method}: expected a function`)
    }
  }
}

/**
 * Throws a TypeError unless `snapshot` matches the BoardSnapshot typedef:
 * an array of columns, and one cardsByColumn array per column id, each card
 * carrying the id of the column it is filed under.
 * @param {unknown} snapshot
 * @returns {void}
 */
function assertSnapshotShape(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new TypeError('snapshot: expected an object')
  }
  const { columns, cardsByColumn } = /** @type {any} */ (snapshot)
  if (!Array.isArray(columns)) {
    throw new TypeError('snapshot.columns: expected an array')
  }
  if (!cardsByColumn || typeof cardsByColumn !== 'object') {
    throw new TypeError('snapshot.cardsByColumn: expected an object')
  }
  for (const column of columns) {
    if (typeof column.id !== 'string' || typeof column.title !== 'string') {
      throw new TypeError('snapshot.columns[]: expected { id, title } strings')
    }
    const cards = cardsByColumn[column.id]
    if (!Array.isArray(cards)) {
      throw new TypeError(`snapshot.cardsByColumn['${column.id}']: expected an array`)
    }
    for (const card of cards) {
      if (typeof card.id !== 'string' || typeof card.title !== 'string') {
        throw new TypeError('card: expected { id, title } strings')
      }
      if (card.columnId !== column.id) {
        throw new TypeError(`card ${card.id}: columnId '${card.columnId}' does not match column '${column.id}'`)
      }
    }
  }
  const extra = Object.keys(cardsByColumn).filter((id) => !columns.some((c) => c.id === id))
  if (extra.length > 0) {
    throw new TypeError(`snapshot.cardsByColumn: no such column(s): ${extra.join(', ')}`)
  }
}

module.exports = { BOARD_METHODS, assertBoardApi, assertSnapshotShape }
