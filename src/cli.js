const { createStore } = require('./lib/todos.js')
const { renderTodos } = require('./components/todo-list/render.js')

const store = createStore()
store.add('try session-share')
store.add('split this app between two people')
console.log(renderTodos(store.all()))
