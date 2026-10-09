const { test } = require('node:test')
const assert = require('node:assert')
const { createBoard } = require('./board.js')

const cardsIn = (board, column) =>
  board.snapshot().columns.find((c) => c.id === column).cards.map((c) => c.id)

test('adds a card to todo by default with per-board ids from 1', () => {
  const board = createBoard()
  assert.deepStrictEqual(board.addCard('first'), { id: 1, title: 'first', column: 'todo' })
  assert.equal(board.addCard('second', 'doing').column, 'doing')
  assert.equal(createBoard().addCard('other board').id, 1)
})

test('snapshot lists all columns in order, even when empty', () => {
  assert.deepStrictEqual(createBoard().snapshot(), {
    columns: [
      { id: 'todo', title: 'To Do', cards: [] },
      { id: 'doing', title: 'Doing', cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ],
  })
})

test('addCard rejects unknown columns and empty or blank titles', () => {
  const board = createBoard()
  assert.throws(() => board.addCard('x', 'backlog'))
  assert.throws(() => board.addCard(''))
  assert.throws(() => board.addCard('   '))
  assert.throws(() => board.addCard(undefined))
  assert.equal(cardsIn(board, 'todo').length, 0)
})

test('moveCard appends to the target column', () => {
  const board = createBoard()
  const a = board.addCard('a')
  const b = board.addCard('b', 'doing')
  board.addCard('c')
  assert.deepStrictEqual(board.moveCard(a.id, 'doing'), { id: a.id, title: 'a', column: 'doing' })
  assert.deepStrictEqual(cardsIn(board, 'doing'), [b.id, a.id])
  assert.deepStrictEqual(cardsIn(board, 'todo'), [3])
  board.moveCard(b.id, 'doing')
  assert.deepStrictEqual(cardsIn(board, 'doing'), [a.id, b.id])
})

test('moveCard returns null for unknown id and throws on unknown column', () => {
  const board = createBoard()
  const a = board.addCard('a')
  assert.equal(board.moveCard(99, 'done'), null)
  assert.throws(() => board.moveCard(a.id, 'archive'))
  assert.deepStrictEqual(cardsIn(board, 'todo'), [a.id])
})

test('removeCard removes known ids and returns false for unknown ones', () => {
  const board = createBoard()
  const a = board.addCard('a')
  assert.equal(board.removeCard(a.id), true)
  assert.equal(board.removeCard(a.id), false)
  assert.equal(board.removeCard(42), false)
  assert.deepStrictEqual(cardsIn(board, 'todo'), [])
})

test('snapshot and returned cards are isolated from the board', () => {
  const board = createBoard()
  const card = board.addCard('a')
  card.title = 'mutated'
  const snap = board.snapshot()
  snap.columns[0].cards[0].title = 'mutated'
  snap.columns[0].cards.push({ id: 9, title: 'x', column: 'todo' })
  snap.columns.pop()
  const fresh = board.snapshot()
  assert.equal(fresh.columns.length, 3)
  assert.deepStrictEqual(fresh.columns[0].cards, [{ id: 1, title: 'a', column: 'todo' }])
})
