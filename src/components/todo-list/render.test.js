const { test } = require('node:test')
const assert = require('node:assert')
const { renderTodos } = require('./render.js')

test('says so when empty', () => {
  assert.equal(renderTodos([]), 'Nothing to do.')
})

test('marks done items', () => {
  const out = renderTodos([{ id: 1, title: 'a', done: true }])
  assert.match(out, /\[x\] 1\. a/)
})
