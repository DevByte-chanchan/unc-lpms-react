import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

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
