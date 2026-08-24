import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')
const indentOf = line => line.match(/^\s*/)[0].length
const sassBlock = (css, selector, after = null) => {
  const lines = css.split(/\r?\n/)
  const parentIndex = after ? lines.findIndex(line => line.trim() === after) : -1
  assert.ok(!after || parentIndex >= 0, `Missing Sass parent block: ${after}`)

  const parentIndent = parentIndex >= 0 ? indentOf(lines[parentIndex]) : -1
  const scopeEnd = parentIndex >= 0
    ? lines.findIndex((line, index) => index > parentIndex && line.trim() && indentOf(line) <= parentIndent)
    : lines.length
  const end = scopeEnd >= 0 ? scopeEnd : lines.length
  const selectorIndex = lines.findIndex((line, index) => (
    index > parentIndex && index < end && line.trim() === selector
  ))
  assert.ok(selectorIndex >= 0, `Missing Sass selector ${selector}${after ? ` under ${after}` : ''}`)

  const selectorIndent = indentOf(lines[selectorIndex])
  const blockEnd = lines.findIndex((line, index) => (
    index > selectorIndex && line.trim() && indentOf(line) <= selectorIndent
  ))
  return lines.slice(selectorIndex, blockEnd >= 0 ? blockEnd : lines.length).join('\n')
}

const rolePages = [
  ['pages/ProgramHeadCourseOfferings.jsx', 'Search courses'],
  ['pages/ProgramHeadIndustryConsultant.jsx', 'Search consultants'],
  ['pages/DeanPrograms.jsx', 'Search programs'],
  ['pages/DeanFaculty.jsx', 'Search faculty'],
]

test('retained Program Head and Dean dialogs stay inside the dynamic viewport', () => {
  const css = read('styles/ProgramHeadWorkspace.module.sass')
  const dialog = sassBlock(css, '.managementDialog')
  const compactActions = sassBlock(css, '.managementDialogActions', '@media (max-width: 720px)')
  const compactDetails = sassBlock(css, '.detailGrid', '@media (max-width: 720px)')

  assert.match(dialog, /max-width:\s*calc\(100vw - 24px\)/)
  assert.match(dialog, /max-height:\s*calc\(100dvh - 24px\)/)
  assert.match(dialog, /box-sizing:\s*border-box/)
  assert.match(dialog, /overflow-y:\s*auto/)
  assert.match(sassBlock(css, '.dialogHeader'), /flex-wrap:\s*wrap/)
  assert.match(compactActions, /flex-wrap:\s*wrap/)
  assert.match(compactDetails, /grid-template-columns:\s*1fr/)

  for (const [file] of rolePages) {
    const page = read(file)
    assert.match(page, /ProgramHeadWorkspace\.module\.sass/)
    assert.match(page, /pageStyles\.managementDialog/)
    assert.match(page, /pageStyles\.dialogHeader/)
    assert.match(page, /pageStyles\.managementDialogActions/)
    assert.doesNotMatch(page, /width:\s*(?:431|500|700|767)\b/)
  }
})

test('populated role toolbars wrap without disconnecting their search inputs', () => {
  const css = read('styles/ProgramHeadWorkspace.module.sass')
  const compactToolbar = sassBlock(css, '.dataToolbar', '@media (max-width: 1024px)')
  const compactControls = sassBlock(css, '.toolbarControls', '@media (max-width: 1024px)')
  const mobileSearch = sassBlock(css, '.searchShell', '@media (max-width: 720px)')
  const searchInput = sassBlock(css, '.searchInput')

  assert.match(compactToolbar, /flex-wrap:\s*wrap/)
  assert.match(compactControls, /width:\s*100%/)
  assert.match(mobileSearch, /width:\s*100%/)
  assert.match(searchInput, /min-width:\s*0/)
  assert.match(searchInput, /width:\s*100%/)

  for (const [file, placeholder] of rolePages) {
    const page = read(file)
    assert.match(page, /pageStyles\.dataToolbar/)
    assert.match(page, /pageStyles\.toolbarControls/)
    assert.match(page, /pageStyles\.searchShell/)
    assert.match(page, /className=\{pageStyles\.searchInput\}/)
    assert.match(page, new RegExp(`value=\\{searchQuery\\}[\\s\\S]*onChange=\\{\\(e\\) => setSearchQuery\\(e\\.target\\.value\\)\\}[\\s\\S]*placeholder="${placeholder}"`))
    assert.doesNotMatch(page, /width:\s*360\b/)
  }
})
