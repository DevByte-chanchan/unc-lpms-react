import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as sass from 'sass'

const here = path.dirname(fileURLToPath(import.meta.url))
const css = sass.compile(path.resolve(here, '../styles/ReferenceLibrary.module.scss')).css

const rule = selector => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))
  assert.ok(match, `Missing compiled style for ${selector}`)
  return match[1]
}

test('reference rows use readable normal-weight text without oversized padding', () => {
  const cells = rule('.tableWrapper table td')
  assert.match(cells, /font-size:\s*15px/)
  assert.match(cells, /font-weight:\s*400/)
  assert.match(cells, /padding:\s*7px 16px/)
})

test('the publication-review marker sits beside the year rather than at the edge', () => {
  const marker = rule('.deprecatedMarker')
  assert.match(marker, /position:\s*static/)
  assert.doesNotMatch(marker, /right:/)
})

test('the reference body can fill its results area without a fixed height cap', () => {
  const body = rule('.tableWrapper table tbody')
  assert.doesNotMatch(body, /max-height:/)
  assert.match(body, /flex:\s*1 1 auto/)
  assert.match(body, /overflow-y:\s*auto/)
})

test('the review marker occupies a fixed slot beside the publication year', () => {
  const yearCell = rule('.tableWrapper table td.yearCell')
  assert.match(yearCell, /display:\s*grid/)
  assert.match(yearCell, /grid-template-columns:\s*4ch\s+7px/)
})
