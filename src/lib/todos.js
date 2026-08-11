/** The todo store. Deliberately small and dependency-free. */

let nextId = 1

function createStore(initial = []) {
  const todos = initial.map((todo) => ({ ...todo }))
  return {
    all: () => todos.map((todo) => ({ ...todo })),
    add(title) {
      const todo = { id: nextId++, title, done: false }
      todos.push(todo)
      return { ...todo }
    },
    toggle(id) {
      const todo = todos.find((t) => t.id === id)
      if (!todo) return null
      todo.done = !todo.done
      return { ...todo }
    },
    remove(id) {
      const index = todos.findIndex((t) => t.id === id)
      if (index === -1) return false
      todos.splice(index, 1)
      return true
    },
  }
}

module.exports = { createStore }
