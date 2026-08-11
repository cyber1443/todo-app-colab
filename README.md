# todo-app-colab

A deliberately small todo app, used to test [session-share](https://github.com/cyber1443/session-share):
two developers and their Claude Codes working the same feature at once without
colliding.

```bash
npm test     # node's test runner, no dependencies
npm start
```

## Layout

```
src/lib/                 the store
src/components/todo-list rendering
docs/                    notes
```

The directories are the point: tasks are cut as vertical slices, so a split
lands cleanly along these seams.

## Trying a session

```
# on one machine
/ss:host Add due dates to todos
# → send the /ss:join ssx_… line to the other machine

# on the other
/ss:join ssx_…
```

Then `/ss:plan add due dates`, approve on the board, `/ss:land`, `/ss:next` on
both, `/ss:done` each, `/ss:ship`.
