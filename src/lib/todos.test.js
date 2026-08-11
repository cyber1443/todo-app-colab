const { test } = require('node:test')
const assert = require('node:assert')
const { createStore } = require('./todos.js')

test('adds a todo', () => {
  const store = createStore()
  const todo = store.add('write tests')
  assert.equal(todo.title, 'write tests')
  assert.equal(todo.done, false)
  assert.equal(store.all().length, 1)
})

test('toggles a todo', () => {
  const store = createStore()
  const todo = store.add('walk')
  assert.equal(store.toggle(todo.id).done, true)
})

test('removes a todo', () => {
  const store = createStore()
  const todo = store.add('gone')
  assert.equal(store.remove(todo.id), true)
  assert.equal(store.all().length, 0)
})
