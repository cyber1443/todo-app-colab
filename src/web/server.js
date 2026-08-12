/**
 * The board over HTTP. Dependency-free node:http, one in-memory board per
 * server, every successful response a full BoardSnapshot so the page can
 * re-render from a single reply.
 */

const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const { createBoard } = require('../lib/board/store.js')
const { BoardError } = require('../lib/board/contract.js')
const {
  DEFAULT_PORT,
  ROUTES,
  ERR_BAD_PAYLOAD,
  ERR_NOT_FOUND,
  PayloadError,
  parseMovePayload,
  parseAddCardPayload,
} = require('../lib/board/web-contract.js')

/** Where the page lives. The drag layer owns what is inside it. */
const PUBLIC_DIR = path.join(__dirname, 'public')

/** Biggest request body accepted, so a stuck client cannot grow the heap. */
const MAX_BODY_BYTES = 64 * 1024

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  })
  res.end(payload)
}

function sendError(res, status, code) {
  sendJson(res, status, { error: code })
}

/**
 * Reads the whole request body and decodes it as JSON.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<unknown>}
 * @throws {PayloadError} on an oversized or malformed body
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new PayloadError('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('error', (error) => reject(error))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (raw.trim() === '') {
        reject(new PayloadError('body must be an object'))
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new PayloadError('body must be valid JSON'))
      }
    })
  })
}

/**
 * Resolves a URL path inside PUBLIC_DIR, or null when it escapes the directory.
 * @param {string} urlPath already percent-decoded
 * @returns {string | null}
 */
function resolvePublicFile(urlPath) {
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '')
  const resolved = path.resolve(PUBLIC_DIR, relative)
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) return null
  return resolved
}

function serveStatic(res, urlPath) {
  const file = resolvePublicFile(urlPath)
  if (file === null) {
    sendError(res, 404, ERR_NOT_FOUND)
    return
  }
  fs.readFile(file, (error, contents) => {
    if (error) {
      sendError(res, 404, ERR_NOT_FOUND)
      return
    }
    const type = CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream'
    res.writeHead(200, { 'content-type': type, 'content-length': contents.length })
    res.end(contents)
  })
}

/**
 * Builds a server over an existing board. The caller owns the board, so tests
 * can seed it and inspect it directly.
 * @param {ReturnType<typeof createBoard>} [board]
 * @returns {import('node:http').Server}
 */
function createServer(board = createBoard()) {
  return http.createServer(async (req, res) => {
    let urlPath
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      sendError(res, 404, ERR_NOT_FOUND)
      return
    }

    try {
      if (req.method === 'GET' && urlPath === ROUTES.snapshot) {
        sendJson(res, 200, board.snapshot())
        return
      }

      if (req.method === 'POST' && urlPath === ROUTES.move) {
        const { cardId, toColumnId, toIndex } = parseMovePayload(await readJsonBody(req))
        board.moveCard(cardId, toColumnId, toIndex)
        sendJson(res, 200, board.snapshot())
        return
      }

      if (req.method === 'POST' && urlPath === ROUTES.addCard) {
        const { columnId, title } = parseAddCardPayload(await readJsonBody(req))
        board.addCard(columnId, title)
        sendJson(res, 200, board.snapshot())
        return
      }

      if (req.method === 'GET' || req.method === 'HEAD') {
        serveStatic(res, urlPath)
        return
      }

      sendError(res, 404, ERR_NOT_FOUND)
    } catch (error) {
      if (error instanceof PayloadError) {
        sendError(res, 400, ERR_BAD_PAYLOAD)
        return
      }
      if (error instanceof BoardError) {
        sendError(res, 404, error.code)
        return
      }
      sendError(res, 500, 'server-error')
    }
  })
}

/** A board with something on it, so the page is not blank on first load. */
function seedDemoBoard() {
  const board = createBoard()
  board.addCard('todo', 'Drag me to another column')
  board.addCard('todo', 'Write the drag layer')
  board.addCard('doing', 'Serve the board over HTTP')
  board.addCard('done', 'Design the web contract')
  return board
}

if (require.main === module) {
  const port = Number(process.env.PORT) || DEFAULT_PORT
  createServer(seedDemoBoard()).listen(port, () => {
    console.log(`board on http://localhost:${port}`)
  })
}

module.exports = { createServer, PUBLIC_DIR, DEFAULT_PORT }
