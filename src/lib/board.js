/** The board store: cards across columns. Dependency-free, one instance per board. */

const { COLUMNS, COLUMN_TITLES, isColumn } = require('./board-types.js')

function assertColumn(column) {
  if (!isColumn(column)) throw new Error(`Unknown column: ${column}`)
}

function createBoard() {
  let nextId = 1
  // Single list in insertion/move order; columns are derived from it.
  const cards = []

  return {
    addCard(title, column = 'todo') {
      if (typeof title !== 'string' || title.trim() === '') {
        throw new Error('Card title must be a non-empty string')
      }
      assertColumn(column)
      const card = { id: nextId++, title, column }
      cards.push(card)
      return { ...card }
    },
    moveCard(id, to) {
      assertColumn(to)
      const index = cards.findIndex((c) => c.id === id)
      if (index === -1) return null
      const [card] = cards.splice(index, 1)
      card.column = to
      cards.push(card)
      return { ...card }
    },
    removeCard(id) {
      const index = cards.findIndex((c) => c.id === id)
      if (index === -1) return false
      cards.splice(index, 1)
      return true
    },
    snapshot() {
      return {
        columns: COLUMNS.map((id) => ({
          id,
          title: COLUMN_TITLES[id],
          cards: cards.filter((c) => c.column === id).map((c) => ({ ...c })),
        })),
      }
    },
  }
}

module.exports = { createBoard }
