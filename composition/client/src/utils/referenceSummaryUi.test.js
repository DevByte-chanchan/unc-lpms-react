import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(path.resolve(here, '..', 'components', 'ReferenceSummary.jsx'), 'utf8')

test('Reference Summary defaults to Textbooks and has no combined view', () => {
  assert.match(source, /useState\(['"]Textbook['"]\)/)
  assert.doesNotMatch(source, /value=['"]All['"]/)
  assert.doesNotMatch(source, /viewType\s*===\s*['"]All['"]/)
  assert.doesNotMatch(source, /ALL REFERENCES/)
})

test('every retained reference category has an option and selected-category empty feedback', () => {
  for (const value of ['Textbook', 'Open Educational Resources', 'Online Resources']) {
    assert.match(source, new RegExp(`value:\\s*['"]${value}['"]`))
  }
  assert.match(source, /activeReferences\.length\s*===\s*0/)
  assert.match(source, /referencesError/)
  assert.match(source, /No .* attached to this plan/)
})
