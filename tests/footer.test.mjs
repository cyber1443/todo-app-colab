import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('Footer component renders the session-share text', () => {
  assert.ok(existsSync(new URL('../src/Footer.jsx', import.meta.url)), 'src/Footer.jsx missing')
  const src = read('src/Footer.jsx')
  assert.match(src, /export default function Footer/)
  assert.match(src, /<footer[\s>]/)
  assert.match(src, /session-share test/)
})

test('App mounts Footer after the main content', () => {
  const app = read('src/App.jsx')
  assert.match(app, /import Footer from '\.\/Footer(\.jsx)?'/)
  const footerAt = app.indexOf('<Footer')
  assert.ok(footerAt > app.indexOf('id="next-steps"'), 'Footer must come after main content')
})
