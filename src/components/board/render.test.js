const { test } = require('node:test')
const assert = require('node:assert')
const { renderBoard } = require('./render.js')

test('renders each column with its cards in order', () => {
  const board = {
    columns: [
      {
        id: 'todo',
        title: 'To Do',
        cards: [
          { id: 1, title: 'first card', column: 'todo' },
          { id: 3, title: 'another', column: 'todo' },
        ],
      },
      { id: 'doing', title: 'Doing', cards: [{ id: 2, title: 'in progress', column: 'doing' }] },
      { id: 'done', title: 'Done', cards: [] },
    ],
  }
  assert.equal(
    renderBoard(board),
    [
      '== To Do (2) ==',
      '- #1 first card',
      '- #3 another',
      '',
      '== Doing (1) ==',
      '- #2 in progress',
      '',
      '== Done (0) ==',
      '  (empty)',
    ].join('\n'),
  )
})

test('renders empty columns with a placeholder and no trailing newline', () => {
  const board = {
    columns: [
      { id: 'todo', title: 'To Do', cards: [] },
      { id: 'doing', title: 'Doing', cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ],
  }
  const output = renderBoard(board)
  assert.equal(
    output,
    '== To Do (0) ==\n  (empty)\n\n== Doing (0) ==\n  (empty)\n\n== Done (0) ==\n  (empty)',
  )
  assert.ok(!output.endsWith('\n'))
})

test('follows board.columns order', () => {
  const board = {
    columns: [
      { id: 'done', title: 'Done', cards: [] },
      { id: 'todo', title: 'To Do', cards: [{ id: 7, title: 'x', column: 'todo' }] },
    ],
  }
  assert.equal(renderBoard(board), '== Done (0) ==\n  (empty)\n\n== To Do (1) ==\n- #7 x')
})
