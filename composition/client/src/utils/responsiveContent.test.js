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

test('shared forms stack side panels and field grids', () => {
  const css = read('styles/Form.module.sass')
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.mainCont[\s\S]*flex-direction:\s*column/)
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.fieldsGridTwo[\s\S]*grid-template-columns:\s*1fr/)
  assert.match(css, /@media \(max-width:\s*720px\)[\s\S]*\.fieldsGridThree[\s\S]*grid-template-columns:\s*1fr/)
})

test('instructor syllabus navigation wraps before its content is squeezed', () => {
  const css = read('styles/SyllabusSections.module.sass')
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.navi[\s\S]*flex-wrap:\s*wrap/)
  assert.match(css, /\.dynamic-sections[\s\S]*min-width:\s*0[\s\S]*overflow-y:\s*auto/)
})

test('shared dialogs are bounded by the dynamic viewport', () => {
  for (const file of [
    'styles/Form.module.sass',
    'styles/Revisions.module.sass',
    'styles/SyllabusPreview.module.sass',
    'styles/ApprovalCommentBox.module.sass',
    'styles/AddReferenceModal.module.sass',
    'styles/PDFViewerModal.module.sass',
  ]) {
    const css = read(file)
    assert.match(css, /100dvh/)
    assert.match(css, /overflow/)
  }
})

test('syllabus preview modal keeps its exact 720px viewport gutters in border-box sizing', () => {
  const css = read('styles/SyllabusPreview.module.sass')
  const modal = sassBlock(css, '.modalContent', '@media (max-width: 720px)')
  assert.match(modal, /width:\s*calc\(100vw - 24px\)/)
  assert.match(modal, /height:\s*calc\(100dvh - 24px\)/)
  assert.match(modal, /padding:\s*16px 12px/)
  assert.match(modal, /box-sizing:\s*border-box/)
})

test('approval comment modal includes its compact and fullscreen padding inside viewport bounds', () => {
  const css = read('styles/ApprovalCommentBox.module.sass')
  const modal = sassBlock(css, '.modal')
  const compactModal = sassBlock(css, '.modal', '@media (max-width: 1024px)')
  assert.match(modal, /padding:\s*12px/)
  assert.match(modal, /box-sizing:\s*border-box/)
  assert.match(compactModal, /width:\s*calc\(100vw - 24px\)/)
  assert.match(compactModal, /max-height:\s*calc\(100dvh - 24px\)/)
})

test('standalone comment recorder owns a responsive page class', () => {
  const page = read('pages/CommentRecorder.jsx')
  assert.match(page, /CommentRecorder\.module\.sass/)
  assert.match(page, /className=\{styles\.page\}/)
})

test('custom dropdown menus cannot exceed their mobile field width', () => {
  for (const file of ['styles/DropdownMultiSelect.module.sass', 'styles/TypeableDropdown.module.sass']) {
    const css = read(file)
    assert.match(css, /@media \(max-width:\s*720px\)/)
    assert.match(css, /\.optionsMenu[\s\S]*max-width:\s*100%/)
    assert.match(css, /\.menuOptionItem[\s\S]*white-space:\s*normal/)
  }
})

test('approval workspace stacks comments at the compact breakpoint', () => {
  const component = read('components/ApprovalSyllabusSections.jsx')
  const css = read('styles/ApprovalSyllabusSections.module.sass')
  const compactViewport = sassBlock(css, '.comments-viewport', '@media (max-width: 1024px)')
  const compactPanel = sassBlock(css, '.comments-panel', '@media (max-width: 1024px)')
  assert.doesNotMatch(component, /width:\s*sidebarCollapsed\s*\?\s*0\s*:\s*380/)
  assert.match(component, /styles\['review-workspace'\]/)
  assert.match(component, /aria-expanded=\{!sidebarCollapsed\}/)
  assert.match(component, /aria-controls="approval-comments-panel"/)
  assert.match(component, /className=\{styles\['comments-viewport'\]\}[\s\S]*inert=\{sidebarCollapsed\}[\s\S]*aria-hidden=\{sidebarCollapsed\}/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.review-workspace[\s\S]*flex-direction:\s*column/)
  assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*\.comments-toggle[\s\S]*width:\s*100%/)
  assert.match(compactViewport, /height:\s*420px/)
  assert.match(compactViewport, /overflow-y:\s*auto/)
  assert.match(compactPanel, /height:\s*100%/)
})

test('role-specific workspaces declare compact and mobile contracts', () => {
  const styleFiles = [
    'styles/ProgramHeadWorkspace.module.sass',
    'styles/CourseCatalog.module.sass',
    'styles/ReferenceLibrary.module.scss',
    'styles/ViewReference.module.scss',
    'styles/VPAA.module.scss',
    'styles/AlignmentTables.module.sass',
  ]
  for (const file of styleFiles) {
    const css = read(file)
    assert.match(css, /max-width:\s*1024px|max-width:\s*1024px\)/)
    assert.match(css, /max-width:\s*720px|max-width:\s*720px\)/)
  }

  for (const file of [
    'pages/lpsm/ProgramHead/COAEPUpload.jsx',
    'pages/lpsm/ProgramHead/CoPoAlignment.jsx',
    'pages/lpsm/ProgramHead/PoPeoAlignment.jsx',
  ]) {
    assert.match(read(file), /ProgramHeadWorkspace\.module\.sass/)
  }

  const libraryCss = read('styles/ReferenceLibrary.module.scss')
  assert.doesNotMatch(libraryCss, /^table\s*\{/m)
  assert.match(libraryCss, /\.tableWrapper\s+table\s*\{/)
})
