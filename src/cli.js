const { createBoard } = require('./lib/board/store.js')
const { renderBoard } = require('./components/board/render.js')

const board = createBoard()
board.addCard('todo', 'try session-share')
board.addCard('todo', 'split this app between two people')
const shipped = board.addCard('todo', 'land the contract')
board.addCard('doing', 'wire the board into the CLI')

// Move a card across columns so the demo shows more than a static list.
board.moveCard(shipped.id, 'done', 0)

console.log(renderBoard(board.snapshot()))
