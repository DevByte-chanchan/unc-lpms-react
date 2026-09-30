import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

test('shared controls preserve keyboard focus and do not globally erase borders', () => {
  const css = read('index.css')

  assert.doesNotMatch(css, /outline:\s*none\s*!important/)
  assert.doesNotMatch(css, /button:hover[\s\S]*border:\s*none\s*!important/)
  assert.match(css, /button:focus-visible[\s\S]*outline:/)
  assert.match(css, /button:disabled/)
})

test('table layout rules are scoped to the shared table region', () => {
  const css = read('index.css')
  const region = read('components/TableScrollRegion.jsx')

  assert.match(region, /data-table-region/)
  assert.match(css, /\[data-table-region\]\s+table/)
  assert.match(css, /\[data-table-region\]\s+tbody/)
  assert.match(css, /\[data-table-region\]\s+th,\s*\[data-table-region\]\s+td/)
  assert.doesNotMatch(css, /(^|\n)\s*table\s*\{/)
  assert.doesNotMatch(css, /(^|\n)\s*tbody\s*\{/)
})

test('duplicate shells and headers reuse the canonical implementation', () => {
  assert.match(read('components/HeaderA.jsx'), /styles\/Header\.module\.sass/)
  assert.match(read('layouts/SkeletonA.jsx'), /Skeleton\.jsx/)
  for (const file of ['styles/Skeleton.module.sass', 'styles/SkeletonA.module.sass']) {
    assert.doesNotMatch(read(file), /(^|\n)\s*\*\s*$/)
  }
})
