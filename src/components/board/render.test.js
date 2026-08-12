const test = require('node:test')
const assert = require('node:assert')

const { renderBoard } = require('./render.js')
const {
  EMPTY_COLUMN_LINE,
  EMPTY_BOARD_LINE,
  SECTION_SEPARATOR,
  columnHeader,
  cardLine,
} = require('./format.js')
const { assertSnapshotShape } = require('../../lib/board/spec.js')

/**
 * Builds a snapshot fixture and checks it against the contract, so a fixture
 * that could never come out of the real store fails here rather than passing.
 * @param {Array<[import('../../lib/board/contract.js').Column, string[]]>} entries
 *   column paired with the card titles in it, top to bottom
 * @returns {import('../../lib/board/contract.js').BoardSnapshot}
 */
function snapshotOf(entries) {
  let seq = 0
  const snapshot = { columns: [], cardsByColumn: {} }
  for (const [column, titles] of entries) {
    snapshot.columns.push(column)
    snapshot.cardsByColumn[column.id] = titles.map((title) => {
      seq += 1
      return { id: `card-${seq}`, title, columnId: column.id }
    })
  }
  assertSnapshotShape(snapshot)
  return snapshot
}

const TODO = { id: 'todo', title: 'To Do' }
const DOING = { id: 'doing', title: 'Doing' }
const DONE = { id: 'done', title: 'Done' }

test('renders a column of cards under its header', () => {
  const snapshot = snapshotOf([[TODO, ['try session-share', 'split this app']]])
  assert.strictEqual(
    renderBoard(snapshot),
    ['== To Do (2) ==', '- card-1 try session-share', '- card-2 split this app'].join('\n'),
  )
})

test('renders an empty column as the empty line', () => {
  const snapshot = snapshotOf([[DOING, []]])
  assert.strictEqual(renderBoard(snapshot), [columnHeader(DOING, 0), EMPTY_COLUMN_LINE].join('\n'))
})

test('keeps snapshot column order and joins sections with the separator', () => {
  const snapshot = snapshotOf([
    [DONE, ['shipped']],
    [TODO, []],
    [DOING, ['in flight']],
  ])
  const sections = renderBoard(snapshot).split(SECTION_SEPARATOR)
  assert.deepStrictEqual(
    sections.map((section) => section.split('\n')[0]),
    [columnHeader(DONE, 1), columnHeader(TODO, 0), columnHeader(DOING, 1)],
  )
})

test('keeps card order within a column', () => {
  const snapshot = snapshotOf([[TODO, ['first', 'second', 'third']]])
  const [, ...cards] = renderBoard(snapshot).split('\n')
  assert.deepStrictEqual(cards, snapshot.cardsByColumn.todo.map(cardLine))
})

test('the header count matches the number of cards rendered', () => {
  const snapshot = snapshotOf([
    [TODO, ['a', 'b', 'c']],
    [DOING, []],
  ])
  for (const section of renderBoard(snapshot).split(SECTION_SEPARATOR)) {
    const [header, ...body] = section.split('\n')
    const count = Number(header.match(/\((\d+)\)/)[1])
    assert.strictEqual(count, body[0] === EMPTY_COLUMN_LINE ? 0 : body.length)
  }
})

test('renders a board with no columns as the empty board line', () => {
  assert.strictEqual(renderBoard(snapshotOf([])), EMPTY_BOARD_LINE)
})

test('never ends with a trailing newline', () => {
  const withCards = renderBoard(snapshotOf([[TODO, ['a']], [DOING, []]]))
  assert.ok(!withCards.endsWith('\n'))
  assert.ok(!renderBoard(snapshotOf([])).endsWith('\n'))
})
