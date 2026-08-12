const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const {
  DEFAULT_COLUMNS,
  ERR_UNKNOWN_COLUMN,
  ERR_UNKNOWN_CARD,
} = require('../src/lib/board/contract.js')
const { BOARD_METHODS } = require('../src/lib/board/spec.js')
const {
  EMPTY_COLUMN_LINE,
  EMPTY_BOARD_LINE,
} = require('../src/components/board/format.js')

const DOC = fs.readFileSync(path.join(__dirname, 'board.md'), 'utf8')

test('documents every default column, by id and by title', () => {
  for (const column of DEFAULT_COLUMNS) {
    assert.ok(DOC.includes(column.id), `board.md does not mention column id '${column.id}'`)
    assert.ok(DOC.includes(column.title), `board.md does not mention column title '${column.title}'`)
  }
})

test('documents both error codes', () => {
  for (const code of [ERR_UNKNOWN_COLUMN, ERR_UNKNOWN_CARD]) {
    assert.ok(DOC.includes(code), `board.md does not mention error code '${code}'`)
  }
})

test('documents every store method', () => {
  for (const method of BOARD_METHODS) {
    assert.ok(DOC.includes(method), `board.md does not mention board.${method}`)
  }
})

test('quotes the empty-column and empty-board lines verbatim', () => {
  assert.ok(DOC.includes(EMPTY_COLUMN_LINE), `board.md does not quote '${EMPTY_COLUMN_LINE}'`)
  assert.ok(DOC.includes(EMPTY_BOARD_LINE), `board.md does not quote '${EMPTY_BOARD_LINE}'`)
})
