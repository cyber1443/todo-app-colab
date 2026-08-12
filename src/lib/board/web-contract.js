/**
 * Shared contract for the browser board.
 *
 * The server (src/web/server.js) and the page (src/web/public/) both import
 * this file and neither imports the other, so the two can be built in any
 * order. Nothing here reaches for the DOM or for node, so the same module
 * loads in a browser via <script> and in node via require.
 *
 * @typedef {Object} MovePayload
 * @property {string} cardId        card being dragged
 * @property {string} toColumnId    column it is dropped on
 * @property {number} [toIndex]     position within that column, 0 at the top;
 *   omitted means append to the end
 *
 * @typedef {Object} AddCardPayload
 * @property {string} columnId
 * @property {string} title
 */

/** Port `npm run web` listens on when PORT is not set. */
const DEFAULT_PORT = 4173

/**
 * The whole HTTP surface. Every response body is a BoardSnapshot as JSON
 * (see src/lib/board/contract.js) except errors, which are { error: code }.
 */
const ROUTES = {
  /** GET -> BoardSnapshot */
  snapshot: '/api/board',
  /** POST MovePayload -> BoardSnapshot */
  move: '/api/board/move',
  /** POST AddCardPayload -> BoardSnapshot */
  addCard: '/api/board/cards',
}

/**
 * Attributes the markup carries and the drag layer reads. The page owns its
 * markup, but these names are fixed so the drag logic can find cards and
 * columns without knowing how the page is laid out.
 */
const DATA_ATTR = {
  /** on a draggable card element, value is Card.id */
  card: 'data-card-id',
  /** on a column drop target, value is Column.id */
  column: 'data-column-id',
}

/** Request body was not shaped like the route expects. */
const ERR_BAD_PAYLOAD = 'bad-payload'

/** No route matched the method and path. */
const ERR_NOT_FOUND = 'not-found'

/** Thrown by the payload parsers; the server turns it into a 400. */
class PayloadError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message)
    this.name = 'PayloadError'
    this.code = ERR_BAD_PAYLOAD
  }
}

function requireString(value, field) {
  if (typeof value !== 'string' || value === '') {
    throw new PayloadError(`${field} must be a non-empty string`)
  }
  return value
}

/**
 * Validates a decoded move request body.
 * @param {unknown} value
 * @returns {MovePayload}
 * @throws {PayloadError}
 */
function parseMovePayload(value) {
  if (value === null || typeof value !== 'object') {
    throw new PayloadError('body must be an object')
  }
  const cardId = requireString(value.cardId, 'cardId')
  const toColumnId = requireString(value.toColumnId, 'toColumnId')
  if (value.toIndex === undefined || value.toIndex === null) {
    return { cardId, toColumnId }
  }
  if (!Number.isInteger(value.toIndex) || value.toIndex < 0) {
    throw new PayloadError('toIndex must be a non-negative integer')
  }
  return { cardId, toColumnId, toIndex: value.toIndex }
}

/**
 * Validates a decoded add-card request body.
 * @param {unknown} value
 * @returns {AddCardPayload}
 * @throws {PayloadError}
 */
function parseAddCardPayload(value) {
  if (value === null || typeof value !== 'object') {
    throw new PayloadError('body must be an object')
  }
  return {
    columnId: requireString(value.columnId, 'columnId'),
    title: requireString(value.title, 'title'),
  }
}

const api = {
  DEFAULT_PORT,
  ROUTES,
  DATA_ATTR,
  ERR_BAD_PAYLOAD,
  ERR_NOT_FOUND,
  PayloadError,
  parseMovePayload,
  parseAddCardPayload,
}

// Loads as a CommonJS module in node and as a global in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api
} else if (typeof globalThis !== 'undefined') {
  globalThis.boardWebContract = api
}
