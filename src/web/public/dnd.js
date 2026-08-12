/**
 * The drag arithmetic, with no DOM in it.
 *
 * The page hands in plain rectangles measured from the live column and the
 * pointer position; everything here is arithmetic on those numbers, so the
 * same functions run under `node --test` against hand-written rectangles.
 *
 * @typedef {Object} CardRect
 * @property {string} id      Card.id the rectangle belongs to
 * @property {number} top     y of the top edge, in the same space as the pointer
 * @property {number} bottom  y of the bottom edge
 */

/**
 * Where a card dropped at `pointerY` lands in a column.
 *
 * A card belongs above the cards whose middle sits below the pointer, so the
 * answer is how many rectangles the pointer has passed the midpoint of. Rects
 * are taken in display order, index 0 at the top.
 *
 * @param {CardRect[]} rects  the column's cards, top to bottom
 * @param {number} pointerY
 * @returns {number} 0..rects.length
 */
function dropIndexFor(rects, pointerY) {
  if (!Array.isArray(rects)) throw new TypeError('rects must be an array')
  if (!Number.isFinite(pointerY)) throw new TypeError('pointerY must be a finite number')

  let index = 0
  for (const rect of rects) {
    const middle = (rect.top + rect.bottom) / 2
    if (pointerY < middle) break
    index += 1
  }
  return index
}

/**
 * The MovePayload for dropping `cardId` on a column at `pointerY`.
 *
 * `rects` are the target column's cards as they look right now, which includes
 * the dragged card itself when it started in this column. The store lifts the
 * card out before inserting it, so an index below its old slot has to come
 * down by one to mean the same gap.
 *
 * @param {Object} drag
 * @param {string} drag.cardId
 * @param {string} drag.toColumnId
 * @param {CardRect[]} drag.rects
 * @param {number} drag.pointerY
 * @returns {{ cardId: string, toColumnId: string, toIndex: number }}
 */
function movePayloadFor({ cardId, toColumnId, rects, pointerY }) {
  if (typeof cardId !== 'string' || cardId === '') throw new TypeError('cardId must be a non-empty string')
  if (typeof toColumnId !== 'string' || toColumnId === '') {
    throw new TypeError('toColumnId must be a non-empty string')
  }

  const raw = dropIndexFor(rects, pointerY)
  const fromIndex = rects.findIndex((rect) => rect.id === cardId)
  const toIndex = fromIndex !== -1 && raw > fromIndex ? raw - 1 : raw
  return { cardId, toColumnId, toIndex }
}

/**
 * Applies a move to a snapshot without waiting for the server, so the card
 * sticks where it was dropped instead of snapping back for a round trip. The
 * snapshot the server returns replaces this one.
 *
 * @param {import('../../lib/board/contract.js').BoardSnapshot} snapshot
 * @param {{ cardId: string, toColumnId: string, toIndex?: number }} move
 * @returns {import('../../lib/board/contract.js').BoardSnapshot} a new snapshot
 */
function applyMove(snapshot, move) {
  /** @type {Record<string, any[]>} */
  const cardsByColumn = {}
  for (const columnId of Object.keys(snapshot.cardsByColumn)) {
    cardsByColumn[columnId] = snapshot.cardsByColumn[columnId].map((card) => ({ ...card }))
  }
  const target = cardsByColumn[move.toColumnId]
  if (!target) return { columns: snapshot.columns, cardsByColumn }

  let card = null
  for (const cards of Object.values(cardsByColumn)) {
    const index = cards.findIndex((one) => one.id === move.cardId)
    if (index !== -1) {
      card = cards.splice(index, 1)[0]
      break
    }
  }
  if (!card) return { columns: snapshot.columns, cardsByColumn }

  const at = move.toIndex === undefined ? target.length : Math.max(0, Math.min(move.toIndex, target.length))
  card.columnId = move.toColumnId
  target.splice(at, 0, card)
  return { columns: snapshot.columns, cardsByColumn }
}

const api = { dropIndexFor, movePayloadFor, applyMove }

// Loads as a CommonJS module in node and as a global in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api
} else if (typeof globalThis !== 'undefined') {
  globalThis.boardDnd = api
}
