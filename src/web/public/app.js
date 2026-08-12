/* The DOM half of the board: render a snapshot, drag cards, post the move. */

;(function () {
  const { ROUTES, DATA_ATTR } = globalThis.boardWebContract
  const { movePayloadFor, applyMove } = globalThis.boardDnd

  const boardEl = document.getElementById('board')
  const errorEl = document.getElementById('error')
  const addForm = document.getElementById('add-card')
  const addColumn = document.getElementById('add-column')
  const addTitle = document.getElementById('add-title')

  /** @type {import('../../lib/board/contract.js').BoardSnapshot | null} */
  let snapshot = null
  /** Card id currently under the pointer, so drop knows what is moving. */
  let draggingId = null

  function showError(message) {
    errorEl.textContent = message
    errorEl.hidden = !message
  }

  /**
   * Every request answers with the whole board, so callers just re-render.
   * @returns {Promise<import('../../lib/board/contract.js').BoardSnapshot>}
   */
  async function call(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || `request failed: ${res.status}`)
    return data
  }

  function cardElement(card) {
    const el = document.createElement('article')
    el.className = 'card'
    el.textContent = card.title
    el.draggable = true
    el.setAttribute(DATA_ATTR.card, card.id)
    return el
  }

  function columnElement(column, cards) {
    const el = document.createElement('section')
    el.className = 'column'
    el.setAttribute(DATA_ATTR.column, column.id)

    const title = document.createElement('h2')
    title.className = 'column-title'
    title.textContent = `${column.title} (${cards.length})`
    el.appendChild(title)

    const list = document.createElement('div')
    list.className = 'cards'
    if (cards.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'empty'
      empty.textContent = 'Drop a card here'
      list.appendChild(empty)
    }
    for (const card of cards) list.appendChild(cardElement(card))
    el.appendChild(list)
    return el
  }

  function render() {
    boardEl.textContent = ''
    for (const column of snapshot.columns) {
      boardEl.appendChild(columnElement(column, snapshot.cardsByColumn[column.id] || []))
    }
    if (addColumn.options.length !== snapshot.columns.length) {
      addColumn.textContent = ''
      for (const column of snapshot.columns) {
        const option = document.createElement('option')
        option.value = column.id
        option.textContent = column.title
        addColumn.appendChild(option)
      }
    }
    if (draggingId) {
      const el = boardEl.querySelector(`[${DATA_ATTR.card}="${draggingId}"]`)
      if (el) el.classList.add('dragging')
    }
  }

  /** The target column's cards as rectangles the drag arithmetic can use. */
  function rectsIn(columnEl) {
    return Array.from(columnEl.querySelectorAll(`[${DATA_ATTR.card}]`)).map((el) => {
      const box = el.getBoundingClientRect()
      return { id: el.getAttribute(DATA_ATTR.card), top: box.top, bottom: box.bottom }
    })
  }

  async function drop(columnEl, pointerY) {
    const cardId = draggingId
    if (!cardId) return
    const move = movePayloadFor({
      cardId,
      toColumnId: columnEl.getAttribute(DATA_ATTR.column),
      rects: rectsIn(columnEl),
      pointerY,
    })

    // Land the card where it was dropped now; the server's answer replaces it.
    snapshot = applyMove(snapshot, move)
    render()

    try {
      snapshot = await call('POST', ROUTES.move, move)
      showError('')
    } catch (error) {
      showError(`move refused: ${error.message}`)
      snapshot = await call('GET', ROUTES.snapshot)
    }
    render()
  }

  boardEl.addEventListener('dragstart', (event) => {
    const card = event.target.closest(`[${DATA_ATTR.card}]`)
    if (!card) return
    draggingId = card.getAttribute(DATA_ATTR.card)
    card.classList.add('dragging')
    event.dataTransfer.effectAllowed = 'move'
    // Firefox only starts a drag once something has been put on the transfer.
    event.dataTransfer.setData('text/plain', draggingId)
  })

  boardEl.addEventListener('dragend', () => {
    draggingId = null
    for (const el of boardEl.querySelectorAll('.dragging')) el.classList.remove('dragging')
    for (const el of boardEl.querySelectorAll('.drag-over')) el.classList.remove('drag-over')
  })

  boardEl.addEventListener('dragover', (event) => {
    const column = event.target.closest(`[${DATA_ATTR.column}]`)
    if (!column || !draggingId) return
    event.preventDefault() // without this the drop never fires
    event.dataTransfer.dropEffect = 'move'
    for (const el of boardEl.querySelectorAll('.drag-over')) el.classList.remove('drag-over')
    column.classList.add('drag-over')
  })

  boardEl.addEventListener('drop', (event) => {
    const column = event.target.closest(`[${DATA_ATTR.column}]`)
    if (!column || !draggingId) return
    event.preventDefault()
    column.classList.remove('drag-over')
    const pointerY = event.clientY
    const moving = drop(column, pointerY)
    draggingId = null
    moving.catch((error) => showError(error.message))
  })

  addForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const title = addTitle.value.trim()
    if (!title) return
    try {
      snapshot = await call('POST', ROUTES.addCard, { columnId: addColumn.value, title })
      addTitle.value = ''
      showError('')
      render()
    } catch (error) {
      showError(`could not add the card: ${error.message}`)
    }
  })

  call('GET', ROUTES.snapshot)
    .then((data) => {
      snapshot = data
      render()
    })
    .catch((error) => showError(`could not load the board: ${error.message}`))
})()
