/**
 * Shared contract for the trello-style board.
 *
 * Every board task imports from this file and nothing in this file depends on
 * a task, so the tasks can be built in any order without touching each other.
 *
 * @typedef {Object} Column
 * @property {string} id     stable, kebab-case, used as the key in a snapshot
 * @property {string} title  human label, shown by the renderer
 *
 * @typedef {Object} Card
 * @property {string} id        unique across the whole board
 * @property {string} title
 * @property {string} columnId  id of the column the card currently sits in
 *
 * @typedef {Object} BoardSnapshot
 * @property {Column[]} columns                      in display order, top to bottom
 * @property {Record<string, Card[]>} cardsByColumn  keyed by column id, one entry
 *   per column (empty array when the column has no cards), each array in display
 *   order with index 0 at the top
 */

/**
 * The columns a board starts with when none are supplied.
 * @type {Column[]}
 */
const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done', title: 'Done' },
]

/** A column id that does not exist on the board. */
const ERR_UNKNOWN_COLUMN = 'unknown-column'

/** A card id that does not exist on the board. */
const ERR_UNKNOWN_CARD = 'unknown-card'

/** The error every board operation throws on bad input. */
class BoardError extends Error {
  /**
   * @param {string} code one of ERR_UNKNOWN_COLUMN, ERR_UNKNOWN_CARD
   * @param {string} [message]
   */
  constructor(code, message) {
    super(message || code)
    this.name = 'BoardError'
    this.code = code
  }
}

let cardSeq = 0

/**
 * Allocates the next card id. Ids are opaque strings; never parse them.
 * @returns {string}
 */
function nextCardId() {
  cardSeq += 1
  return `card-${cardSeq}`
}

/**
 * Resets the card id counter, for tests that assert on exact ids.
 * @returns {void}
 */
function resetCardIds() {
  cardSeq = 0
}

module.exports = {
  DEFAULT_COLUMNS,
  ERR_UNKNOWN_COLUMN,
  ERR_UNKNOWN_CARD,
  BoardError,
  nextCardId,
  resetCardIds,
}
