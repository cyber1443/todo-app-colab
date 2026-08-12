const test = require('node:test')
const assert = require('node:assert')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const { createBoard } = require('./lib/board/store.js')
const { DEFAULT_COLUMNS } = require('./lib/board/contract.js')
const { assertBoardApi } = require('./lib/board/spec.js')
const { columnHeader, cardLine } = require('./components/board/format.js')

const REPO_ROOT = path.join(__dirname, '..')

function runCli() {
  return execFileSync('node', ['src/cli.js'], { cwd: REPO_ROOT, encoding: 'utf8' })
}

test('the CLI exits 0', () => {
  assert.doesNotThrow(runCli)
})

test('the CLI prints a header for every default column', () => {
  const output = runCli()
  for (const column of DEFAULT_COLUMNS) {
    const header = output
      .split('\n')
      .find((line) => line.startsWith(`== ${column.title} (`))
    assert.ok(header, `no header line for column '${column.id}'`)
    const count = Number(header.match(/\((\d+)\)/)[1])
    assert.strictEqual(header, columnHeader(column, count))
  }
})

test('the CLI prints a card line for a seeded card', () => {
  const lines = runCli().split('\n')
  const cards = lines.filter((line) => line.startsWith('- '))
  assert.ok(cards.length > 0, 'expected at least one card line')
  for (const line of cards) {
    const [, id, title] = line.match(/^- (\S+) (.+)$/)
    assert.strictEqual(line, cardLine({ id, title, columnId: 'todo' }))
  }
})

test('createBoard() gives the CLI the store surface it expects', () => {
  assertBoardApi(createBoard())
})
