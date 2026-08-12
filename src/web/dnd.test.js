const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const { dropIndexFor, movePayloadFor, applyMove } = require('./public/dnd.js')

/** Three 40px-tall cards stacked from y=0, so midpoints are 20, 70 and 120. */
const RECTS = [
  { id: 'card-1', top: 0, bottom: 40 },
  { id: 'card-2', top: 50, bottom: 90 },
  { id: 'card-3', top: 100, bottom: 140 },
]

test('an empty column always takes index 0', () => {
  assert.strictEqual(dropIndexFor([], 0), 0)
  assert.strictEqual(dropIndexFor([], 999), 0)
})

test('above the first midpoint is the top slot', () => {
  assert.strictEqual(dropIndexFor(RECTS, 0), 0)
  assert.strictEqual(dropIndexFor(RECTS, 19), 0)
})

test('past a midpoint means below that card', () => {
  assert.strictEqual(dropIndexFor(RECTS, 20), 1)
  assert.strictEqual(dropIndexFor(RECTS, 60), 1)
  assert.strictEqual(dropIndexFor(RECTS, 80), 2)
})

test('below every midpoint is the bottom slot', () => {
  assert.strictEqual(dropIndexFor(RECTS, 200), RECTS.length)
})

test('a drop in the gap between two cards counts the one above it', () => {
  assert.strictEqual(dropIndexFor(RECTS, 45), 1)
  assert.strictEqual(dropIndexFor(RECTS, 95), 2)
})

test('bad arguments are refused rather than guessed at', () => {
  assert.throws(() => dropIndexFor(null, 10), TypeError)
  assert.throws(() => dropIndexFor(RECTS, Number.NaN), TypeError)
  assert.throws(() => movePayloadFor({ cardId: '', toColumnId: 'todo', rects: [], pointerY: 0 }), TypeError)
  assert.throws(() => movePayloadFor({ cardId: 'card-1', toColumnId: '', rects: [], pointerY: 0 }), TypeError)
})

test('a move into another column uses the raw drop index', () => {
  const payload = movePayloadFor({
    cardId: 'card-9',
    toColumnId: 'doing',
    rects: RECTS,
    pointerY: 80,
  })
  assert.deepStrictEqual(payload, { cardId: 'card-9', toColumnId: 'doing', toIndex: 2 })
})

test('a move into an empty column is index 0', () => {
  assert.deepStrictEqual(
    movePayloadFor({ cardId: 'card-9', toColumnId: 'done', rects: [], pointerY: 300 }),
    { cardId: 'card-9', toColumnId: 'done', toIndex: 0 },
  )
})

test('within one column, a drop below the card comes down one for the lift', () => {
  // card-1 dragged to the bottom: three slots pre-lift, index 2 once lifted.
  assert.strictEqual(
    movePayloadFor({ cardId: 'card-1', toColumnId: 'todo', rects: RECTS, pointerY: 200 }).toIndex,
    2,
  )
})

test('within one column, a drop above the card keeps the raw index', () => {
  assert.strictEqual(
    movePayloadFor({ cardId: 'card-3', toColumnId: 'todo', rects: RECTS, pointerY: 10 }).toIndex,
    0,
  )
})

test('dropping a card back on its own slot is a no-op index', () => {
  assert.strictEqual(
    movePayloadFor({ cardId: 'card-2', toColumnId: 'todo', rects: RECTS, pointerY: 60 }).toIndex,
    1,
  )
})

/** A snapshot shaped like the one the API returns. */
function snapshot() {
  return {
    columns: [
      { id: 'todo', title: 'To Do' },
      { id: 'doing', title: 'Doing' },
    ],
    cardsByColumn: {
      todo: [
        { id: 'card-1', title: 'one', columnId: 'todo' },
        { id: 'card-2', title: 'two', columnId: 'todo' },
      ],
      doing: [{ id: 'card-3', title: 'three', columnId: 'doing' }],
    },
  }
}

const idsIn = (snap, columnId) => snap.cardsByColumn[columnId].map((card) => card.id)

test('applyMove moves the card across columns at the given index', () => {
  const next = applyMove(snapshot(), { cardId: 'card-1', toColumnId: 'doing', toIndex: 0 })
  assert.deepStrictEqual(idsIn(next, 'todo'), ['card-2'])
  assert.deepStrictEqual(idsIn(next, 'doing'), ['card-1', 'card-3'])
  assert.strictEqual(next.cardsByColumn.doing[0].columnId, 'doing')
})

test('applyMove reorders within a column', () => {
  const next = applyMove(snapshot(), { cardId: 'card-1', toColumnId: 'todo', toIndex: 1 })
  assert.deepStrictEqual(idsIn(next, 'todo'), ['card-2', 'card-1'])
})

test('applyMove with no index appends, and clamps one past the end', () => {
  assert.deepStrictEqual(idsIn(applyMove(snapshot(), { cardId: 'card-1', toColumnId: 'doing' }), 'doing'), [
    'card-3',
    'card-1',
  ])
  assert.deepStrictEqual(
    idsIn(applyMove(snapshot(), { cardId: 'card-1', toColumnId: 'doing', toIndex: 99 }), 'doing'),
    ['card-3', 'card-1'],
  )
})

test('applyMove leaves the snapshot it was given untouched', () => {
  const before = snapshot()
  applyMove(before, { cardId: 'card-1', toColumnId: 'doing', toIndex: 0 })
  assert.deepStrictEqual(idsIn(before, 'todo'), ['card-1', 'card-2'])
  assert.deepStrictEqual(idsIn(before, 'doing'), ['card-3'])
})

test('applyMove ignores an unknown card or column', () => {
  assert.deepStrictEqual(
    idsIn(applyMove(snapshot(), { cardId: 'card-nope', toColumnId: 'doing', toIndex: 0 }), 'doing'),
    ['card-3'],
  )
  const untouched = applyMove(snapshot(), { cardId: 'card-1', toColumnId: 'nope', toIndex: 0 })
  assert.deepStrictEqual(idsIn(untouched, 'todo'), ['card-1', 'card-2'])
})

/**
 * The scripts index.html loads, in the order it loads them. Requiring these
 * files gives each one its own module scope, which is exactly what the browser
 * does not do, so the collisions that matter can only be seen by running them
 * the way the page runs them: one shared global scope, in order.
 */
function pageScripts() {
  const publicDir = path.join(__dirname, 'public')
  const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8')
  const sources = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((match) => match[1])
  assert.ok(sources.length >= 2, 'index.html should load at least the contract and the drag layer')
  return sources.map((src) => ({
    src,
    code: fs.readFileSync(path.join(publicDir, src.replace(/^\//, '')), 'utf8'),
  }))
}

test('every script the page loads shares one scope without colliding', () => {
  const context = vm.createContext({})
  vm.runInContext('globalThis.module = undefined', context)

  for (const { src, code } of pageScripts()) {
    try {
      vm.runInContext(code, context, { filename: src })
    } catch (error) {
      // A collision shows up while the script is being instantiated, before a
      // line of it runs. Anything else is this harness having no DOM, which is
      // not what this test is about. The error is built inside the vm context,
      // so it is not an instanceof this realm's SyntaxError; go by name.
      assert.notStrictEqual(
        error.name,
        'SyntaxError',
        `${src} cannot be loaded alongside the scripts before it: ${error.message}`,
      )
    }
  }
})

test('the page gets both globals its app.js destructures on load', () => {
  const context = vm.createContext({})
  vm.runInContext('globalThis.module = undefined', context)
  for (const { src, code } of pageScripts()) {
    if (src.endsWith('/app.js')) continue // needs a DOM; the two libraries do not
    vm.runInContext(code, context, { filename: src })
  }

  assert.strictEqual(vm.runInContext('typeof globalThis.boardWebContract', context), 'object')
  assert.strictEqual(vm.runInContext('typeof globalThis.boardDnd', context), 'object')
  assert.strictEqual(vm.runInContext('typeof globalThis.boardDnd.movePayloadFor', context), 'function')
})

test('the drop index and the store agree on where a card lands', async () => {
  const { createBoard } = require('../lib/board/store.js')
  const board = createBoard()
  const first = board.addCard('todo', 'one')
  const second = board.addCard('todo', 'two')
  const third = board.addCard('todo', 'three')
  const rects = [first, second, third].map((card, index) => ({
    id: card.id,
    top: index * 50,
    bottom: index * 50 + 40,
  }))

  // Drag the top card into the gap between the second and the third.
  const move = movePayloadFor({ cardId: first.id, toColumnId: 'todo', rects, pointerY: 95 })
  board.moveCard(move.cardId, move.toColumnId, move.toIndex)
  assert.deepStrictEqual(
    board.snapshot().cardsByColumn.todo.map((card) => card.id),
    [second.id, first.id, third.id],
  )
})
