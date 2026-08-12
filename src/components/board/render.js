/** Renders a board snapshot as plain text. Swap for a real UI later. */

const {
  EMPTY_COLUMN_LINE,
  EMPTY_BOARD_LINE,
  SECTION_SEPARATOR,
  columnHeader,
  cardLine,
} = require('./format.js')

/**
 * @param {import('../../lib/board/contract.js').BoardSnapshot} snapshot
 * @returns {string}
 */
function renderBoard(snapshot) {
  const { columns, cardsByColumn } = snapshot
  if (columns.length === 0) return EMPTY_BOARD_LINE

  return columns
    .map((column) => {
      const cards = cardsByColumn[column.id]
      const body = cards.length === 0 ? [EMPTY_COLUMN_LINE] : cards.map(cardLine)
      return [columnHeader(column, cards.length), ...body].join('\n')
    })
    .join(SECTION_SEPARATOR)
}

module.exports = { renderBoard }
