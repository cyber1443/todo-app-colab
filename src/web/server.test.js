const test = require('node:test')
const assert = require('node:assert')
const fs = require('node:fs')
const path = require('node:path')

const { createServer, PUBLIC_DIR } = require('./server.js')
const { createBoard } = require('../lib/board/store.js')
const { ROUTES, ERR_BAD_PAYLOAD, ERR_NOT_FOUND } = require('../lib/board/web-contract.js')
const { ERR_UNKNOWN_CARD, ERR_UNKNOWN_COLUMN } = require('../lib/board/contract.js')

/**
 * Starts a server on an ephemeral port and hands back a fetch bound to it.
 * @param {ReturnType<typeof createBoard>} [board]
 */
async function start(board) {
  const server = createServer(board)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  const call = async (method, urlPath, body) => {
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    })
    return res
  }
  return {
    call,
    json: async (...args) => (await call(...args)).json(),
    close: () => new Promise((resolve) => server.close(resolve)),
  }
}

test('GET /api/board returns the snapshot', async () => {
  const board = createBoard()
  const card = board.addCard('todo', 'a card')
  const app = await start(board)
  try {
    const res = await app.call('GET', ROUTES.snapshot)
    assert.strictEqual(res.status, 200)
    assert.match(res.headers.get('content-type'), /application\/json/)
    const snapshot = await res.json()
    assert.deepStrictEqual(
      snapshot.columns.map((column) => column.id),
      ['todo', 'doing', 'done'],
    )
    assert.deepStrictEqual(snapshot.cardsByColumn.todo, [card])
    assert.deepStrictEqual(snapshot.cardsByColumn.done, [])
  } finally {
    await app.close()
  }
})

test('POST move relocates the card and answers with the whole snapshot', async () => {
  const board = createBoard()
  const first = board.addCard('doing', 'first')
  const moved = board.addCard('todo', 'moving')
  const app = await start(board)
  try {
    const res = await app.call('POST', ROUTES.move, {
      cardId: moved.id,
      toColumnId: 'doing',
      toIndex: 0,
    })
    assert.strictEqual(res.status, 200)
    const snapshot = await res.json()
    assert.deepStrictEqual(snapshot.cardsByColumn.todo, [])
    assert.deepStrictEqual(
      snapshot.cardsByColumn.doing.map((card) => card.id),
      [moved.id, first.id],
    )
  } finally {
    await app.close()
  }
})

test('POST move with no index appends to the bottom', async () => {
  const board = createBoard()
  const first = board.addCard('doing', 'first')
  const moved = board.addCard('todo', 'moving')
  const app = await start(board)
  try {
    const snapshot = await app.json('POST', ROUTES.move, {
      cardId: moved.id,
      toColumnId: 'doing',
    })
    assert.deepStrictEqual(
      snapshot.cardsByColumn.doing.map((card) => card.id),
      [first.id, moved.id],
    )
  } finally {
    await app.close()
  }
})

test('POST cards adds to the column and answers with the whole snapshot', async () => {
  const app = await start()
  try {
    const res = await app.call('POST', ROUTES.addCard, { columnId: 'todo', title: 'fresh' })
    assert.strictEqual(res.status, 200)
    const snapshot = await res.json()
    assert.strictEqual(snapshot.cardsByColumn.todo.length, 1)
    assert.strictEqual(snapshot.cardsByColumn.todo[0].title, 'fresh')
    assert.strictEqual(snapshot.cardsByColumn.todo[0].columnId, 'todo')
  } finally {
    await app.close()
  }
})

test('a bad payload is a 400 bad-payload', async () => {
  const app = await start()
  try {
    for (const body of [{}, { cardId: 'card-1' }, { cardId: 'card-1', toColumnId: 'doing', toIndex: -1 }]) {
      const res = await app.call('POST', ROUTES.move, body)
      assert.strictEqual(res.status, 400)
      assert.deepStrictEqual(await res.json(), { error: ERR_BAD_PAYLOAD })
    }
    const addRes = await app.call('POST', ROUTES.addCard, { columnId: 'todo', title: '' })
    assert.strictEqual(addRes.status, 400)
    assert.deepStrictEqual(await addRes.json(), { error: ERR_BAD_PAYLOAD })
  } finally {
    await app.close()
  }
})

test('a body that is not JSON at all is a 400 bad-payload', async () => {
  const app = await start()
  try {
    for (const raw of ['', 'not json']) {
      const res = await app.call('POST', ROUTES.move, raw)
      assert.strictEqual(res.status, 400)
      assert.deepStrictEqual(await res.json(), { error: ERR_BAD_PAYLOAD })
    }
  } finally {
    await app.close()
  }
})

test('an unknown card is a 404 carrying the store error code', async () => {
  const app = await start()
  try {
    const res = await app.call('POST', ROUTES.move, { cardId: 'card-nope', toColumnId: 'doing' })
    assert.strictEqual(res.status, 404)
    assert.deepStrictEqual(await res.json(), { error: ERR_UNKNOWN_CARD })
  } finally {
    await app.close()
  }
})

test('an unknown column is a 404 carrying the store error code', async () => {
  const board = createBoard()
  const card = board.addCard('todo', 'staying')
  const app = await start(board)
  try {
    const moveRes = await app.call('POST', ROUTES.move, { cardId: card.id, toColumnId: 'nope' })
    assert.strictEqual(moveRes.status, 404)
    assert.deepStrictEqual(await moveRes.json(), { error: ERR_UNKNOWN_COLUMN })

    const addRes = await app.call('POST', ROUTES.addCard, { columnId: 'nope', title: 'x' })
    assert.strictEqual(addRes.status, 404)
    assert.deepStrictEqual(await addRes.json(), { error: ERR_UNKNOWN_COLUMN })

    assert.deepStrictEqual((await app.json('GET', ROUTES.snapshot)).cardsByColumn.todo, [card])
  } finally {
    await app.close()
  }
})

test('the wrong method on an api route does not match', async () => {
  const app = await start()
  try {
    const res = await app.call('POST', ROUTES.snapshot, {})
    assert.strictEqual(res.status, 404)
    assert.deepStrictEqual(await res.json(), { error: ERR_NOT_FOUND })
  } finally {
    await app.close()
  }
})

test('an unknown path is a 404 not-found', async () => {
  const app = await start()
  try {
    const res = await app.call('GET', '/api/nope')
    assert.strictEqual(res.status, 404)
    assert.deepStrictEqual(await res.json(), { error: ERR_NOT_FOUND })
  } finally {
    await app.close()
  }
})

test('a path escaping the public directory is refused', async () => {
  const app = await start()
  try {
    for (const urlPath of ['/../server.js', '/%2e%2e/server.js', '/..%2f..%2fpackage.json']) {
      const res = await app.call('GET', urlPath)
      assert.strictEqual(res.status, 404, urlPath)
      assert.deepStrictEqual(await res.json(), { error: ERR_NOT_FOUND }, urlPath)
    }
  } finally {
    await app.close()
  }
})

test('a file under public is served with its content type', async (t) => {
  // The page is the other half of this ticket; only assert on it once it lands.
  const index = path.join(PUBLIC_DIR, 'index.html')
  if (!fs.existsSync(index)) {
    t.skip('src/web/public/index.html not built yet')
    return
  }
  const app = await start()
  try {
    const res = await app.call('GET', '/')
    assert.strictEqual(res.status, 200)
    assert.match(res.headers.get('content-type'), /text\/html/)
    assert.strictEqual(await res.text(), fs.readFileSync(index, 'utf8'))
  } finally {
    await app.close()
  }
})

test('each server keeps its own board', async () => {
  const first = await start()
  const second = await start()
  try {
    await first.call('POST', ROUTES.addCard, { columnId: 'todo', title: 'only mine' })
    assert.strictEqual((await second.json('GET', ROUTES.snapshot)).cardsByColumn.todo.length, 0)
  } finally {
    await first.close()
    await second.close()
  }
})
