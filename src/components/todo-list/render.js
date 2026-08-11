/** Renders todos as plain text. Swap for a real UI later. */
function renderTodos(todos) {
  if (todos.length === 0) return 'Nothing to do.'
  return todos.map((todo) => `${todo.done ? '[x]' : '[ ]'} ${todo.id}. ${todo.title}`).join('\n')
}

module.exports = { renderTodos }
