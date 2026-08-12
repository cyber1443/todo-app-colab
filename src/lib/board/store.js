/** The board store. Deliberately small and dependency-free. */

const {
  DEFAULT_COLUMNS,
  ERR_UNKNOWN_COLUMN,
  ERR_UNKNOWN_CARD,
  BoardError,
  nextCardId,
} = require('./contract.js')

/**
 * Creates a board holding cards in ordered columns.
 * @param {import('./contract.js').Column[]} [columns] display order, top to bottom
 * @returns {{
 *   snapshot: () => import('./contract.js').BoardSnapshot,
 *   addCard: (columnId: string, title: string) => import('./contract.js').Card,
 *   moveCard: (cardId: string, toColumnId: string, toIndex?: number) => import('./contract.js').Card,
 *   removeCard: (cardId: string) => boolean,
 * }}
 */
function createBoard(columns = DEFAULT_COLUMNS) {
  const cols = columns.map((column) => ({ ...column }))
  /** @type {Map<string, import('./contract.js').Card[]>} */
  const cardsByColumn = new Map(cols.map((column) => [column.id, []]))

  function columnOrThrow(columnId) {
    const cards = cardsByColumn.get(columnId)
    if (!cards) throw new BoardError(ERR_UNKNOWN_COLUMN, `no such column: ${columnId}`)
    return cards
  }

  function locate(cardId) {
    for (const [columnId, cards] of cardsByColumn) {
      const index = cards.findIndex((card) => card.id === cardId)
      if (index !== -1) return { columnId, cards, index }
    }
    return null
  }

  return {
    snapshot() {
      /** @type {Record<string, import('./contract.js').Card[]>} */
      const byColumn = {}
      for (const column of cols) {
        byColumn[column.id] = cardsByColumn.get(column.id).map((card) => ({ ...card }))
      }
      return { columns: cols.map((column) => ({ ...column })), cardsByColumn: byColumn }
    },
    addCard(columnId, title) {
      const cards = columnOrThrow(columnId)
      const card = { id: nextCardId(), title, columnId }
      cards.push(card)
      return { ...card }
    },
    moveCard(cardId, toColumnId, toIndex) {
      const found = locate(cardId)
      if (!found) throw new BoardError(ERR_UNKNOWN_CARD, `no such card: ${cardId}`)
      const target = columnOrThrow(toColumnId)

      const [card] = found.cards.splice(found.index, 1)
      const at = toIndex === undefined ? target.length : Math.max(0, Math.min(toIndex, target.length))
      card.columnId = toColumnId
      target.splice(at, 0, card)
      return { ...card }
    },
    removeCard(cardId) {
      const found = locate(cardId)
      if (!found) return false
      found.cards.splice(found.index, 1)
      return true
    },
  }
}

module.exports = { createBoard }
