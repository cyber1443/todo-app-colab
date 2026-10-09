/** Renders a board as plain text, one block per column. */
function renderColumn(column) {
  const header = `== ${column.title} (${column.cards.length}) ==`
  if (column.cards.length === 0) return `${header}\n  (empty)`
  return [header, ...column.cards.map((card) => `- #${card.id} ${card.title}`)].join('\n')
}

function renderBoard(board) {
  return board.columns.map(renderColumn).join('\n\n')
}

module.exports = { renderBoard }
