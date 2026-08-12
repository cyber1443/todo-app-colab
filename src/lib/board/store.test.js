const test = require('node:test')
const assert = require('node:assert')

const { createBoard } = require('./store.js')
const {
  DEFAULT_COLUMNS,
  ERR_UNKNOWN_COLUMN,
  ERR_UNKNOWN_CARD,
  BoardError,
  resetCardIds,
} = require('./contract.js')
const { assertBoardApi, assertSnapshotShape } = require('./spec.js')

test('starts with the default columns, each one empty', () => {
  const board = createBoard()
  const snapshot = board.snapshot()
  assert.deepStrictEqual(snapshot.columns, DEFAULT_COLUMNS)
  for (const column of DEFAULT_COLUMNS) {
    assert.deepStrictEqual(snapshot.cardsByColumn[column.id], [])
  }
})

test('satisfies the store spec', () => {
  const board = createBoard()
  board.addCard('todo', 'a card')
  assertBoardApi(board)
  assertSnapshotShape(board.snapshot())
})

test('addCard appends to the bottom of the column', () => {
  resetCardIds()
  const board = createBoard()
  const first = board.addCard('todo', 'first')
  const second = board.addCard('todo', 'second')
  assert.deepStrictEqual(first, { id: 'card-1', title: 'first', columnId: 'todo' })
  assert.deepStrictEqual(board.snapshot().cardsByColumn.todo, [first, second])
})

test('addCard to an unknown column throws ERR_UNKNOWN_COLUMN', () => {
  const board = createBoard()
  assert.throws(
    () => board.addCard('nope', 'a card'),
    (error) => error instanceof BoardError && error.code === ERR_UNKNOWN_COLUMN,
  )
})

test('moveCard across columns inserts at the given index', () => {
  const board = createBoard()
  const top = board.addCard('doing', 'already here')
  const moved = board.addCard('todo', 'moving')
  assert.strictEqual(board.moveCard(moved.id, 'doing', 1).columnId, 'doing')
  const snapshot = board.snapshot()
  assert.deepStrictEqual(snapshot.cardsByColumn.todo, [])
  assert.deepStrictEqual(
    snapshot.cardsByColumn.doing.map((card) => card.id),
    [top.id, moved.id],
  )
})

test('moveCard to index 0 puts the card on top', () => {
  const board = createBoard()
  const first = board.addCard('doing', 'first')
  const moved = board.addCard('todo', 'moving')
  board.moveCard(moved.id, 'doing', 0)
  assert.deepStrictEqual(
    board.snapshot().cardsByColumn.doing.map((card) => card.id),
    [moved.id, first.id],
  )
})

test('moveCard clamps an index past the end to the bottom', () => {
  const board = createBoard()
  const first = board.addCard('doing', 'first')
  const moved = board.addCard('todo', 'moving')
  board.moveCard(moved.id, 'doing', 99)
  assert.deepStrictEqual(
    board.snapshot().cardsByColumn.doing.map((card) => card.id),
    [first.id, moved.id],
  )
})

test('moveCard clamps a negative index to the top', () => {
  const board = createBoard()
  const first = board.addCard('doing', 'first')
  const moved = board.addCard('todo', 'moving')
  board.moveCard(moved.id, 'doing', -5)
  assert.deepStrictEqual(
    board.snapshot().cardsByColumn.doing.map((card) => card.id),
    [moved.id, first.id],
  )
})

test('moveCard with no index appends to the bottom', () => {
  const board = createBoard()
  const first = board.addCard('doing', 'first')
  const moved = board.addCard('todo', 'moving')
  board.moveCard(moved.id, 'doing')
  assert.deepStrictEqual(
    board.snapshot().cardsByColumn.doing.map((card) => card.id),
    [first.id, moved.id],
  )
})

test('a move within one column reorders, with the index applied after the lift', () => {
  const board = createBoard()
  const a = board.addCard('todo', 'a')
  const b = board.addCard('todo', 'b')
  const c = board.addCard('todo', 'c')
  board.moveCard(a.id, 'todo', 2)
  assert.deepStrictEqual(
    board.snapshot().cardsByColumn.todo.map((card) => card.id),
    [b.id, c.id, a.id],
  )
})

test('moveCard of an unknown card throws ERR_UNKNOWN_CARD', () => {
  const board = createBoard()
  assert.throws(
    () => board.moveCard('card-nope', 'doing'),
    (error) => error instanceof BoardError && error.code === ERR_UNKNOWN_CARD,
  )
})

test('moveCard to an unknown column throws ERR_UNKNOWN_COLUMN and leaves the card put', () => {
  const board = createBoard()
  const card = board.addCard('todo', 'staying')
  assert.throws(
    () => board.moveCard(card.id, 'nope'),
    (error) => error instanceof BoardError && error.code === ERR_UNKNOWN_COLUMN,
  )
  assert.deepStrictEqual(board.snapshot().cardsByColumn.todo, [card])
})

test('removeCard returns true once, then false for the same id', () => {
  const board = createBoard()
  const card = board.addCard('todo', 'going away')
  assert.strictEqual(board.removeCard(card.id), true)
  assert.strictEqual(board.removeCard(card.id), false)
  assert.deepStrictEqual(board.snapshot().cardsByColumn.todo, [])
})

test('mutating a returned snapshot leaves the board unchanged', () => {
  const board = createBoard()
  const card = board.addCard('todo', 'untouchable')
  const snapshot = board.snapshot()
  snapshot.columns.push({ id: 'extra', title: 'Extra' })
  snapshot.cardsByColumn.todo.push({ id: 'fake', title: 'fake', columnId: 'todo' })
  snapshot.cardsByColumn.todo[0].title = 'renamed'

  const fresh = board.snapshot()
  assert.deepStrictEqual(fresh.columns, DEFAULT_COLUMNS)
  assert.deepStrictEqual(fresh.cardsByColumn.todo, [card])
})

test('custom columns replace the defaults', () => {
  const board = createBoard([{ id: 'inbox', title: 'Inbox' }])
  const snapshot = board.snapshot()
  assert.deepStrictEqual(snapshot.columns, [{ id: 'inbox', title: 'Inbox' }])
  assert.deepStrictEqual(Object.keys(snapshot.cardsByColumn), ['inbox'])
})
