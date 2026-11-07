import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as sass from 'sass'

const here = path.dirname(fileURLToPath(import.meta.url))
const src = path.resolve(here, '..')
const read = relative => fs.readFileSync(path.join(src, relative), 'utf8')

const tableConsumers = [
  'components/CoursesTable.jsx',
  'components/ApprovalCoursesTable.jsx',
  'components/FacultyTable.jsx',
  'components/ProgramsTable.jsx',
  'components/CourseDetails.jsx',
  'components/ILOs.jsx',
  'components/OutcomeAlignment.jsx',
  'components/CriteriaForGrading.jsx',
  'components/ReferenceSummary.jsx',
  'components/SyllabusRevisionsSections.jsx',
  'components/ApprovalSyllabusSections.jsx',
  'pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx',
  'pages/lpsm/ProgramHead/CoPoAlignment.jsx',
  'pages/lpsm/ProgramHead/PoPeoAlignment.jsx',
]

test('TableScrollRegion owns overflow and exposes an accessible label', () => {
  const component = read('components/TableScrollRegion.jsx')
  const styles = read('styles/TableScrollRegion.module.sass')
  assert.match(component, /role="region"/)
  assert.match(component, /aria-label=\{label\}/)
  assert.match(component, /tabIndex=\{0\}/)
  assert.match(styles, /overflow-x:\s*auto/)
  assert.match(styles, /min-width:\s*0/)
  assert.match(styles, /flex:\s*1/)
  assert.match(styles, /min-height:\s*0/)
})

test('narrow tables keep a visible horizontal scrollbar even when consumer styles conflict', () => {
  const styles = read('styles/TableScrollRegion.module.sass')
  assert.match(styles, /overflow-x:\s*auto\s*!important/)
  // The bar itself is the app's one scrollbar (index.css), not a style of its own.
  assert.doesNotMatch(styles, /scrollbar-color|::-webkit-scrollbar/)
})

test('every scrollbar is the same thin bar, set once in index.css', () => {
  const css = read('index.css')
  assert.match(css, /--scrollbar-thumb:\s*#5f6f78/)
  assert.match(css, /--scrollbar-track:\s*#e5e9ec/)
  assert.match(css, /\*::-webkit-scrollbar-button\s*\{\s*display:\s*none/, 'no arrow buttons')
  assert.match(css, /\*::-webkit-scrollbar-thumb:active\s*\{\s*background:\s*var\(--scrollbar-thumb-active\)/, 'the bar stays visible while dragged')
  // The standard properties only for Firefox: in Chrome they would replace the 8px bar with a wider one with arrows.
  assert.match(css, /@supports \(-moz-appearance: none\)\s*\{\s*\*\s*\{\s*scrollbar-width:\s*thin;\s*scrollbar-color:\s*var\(--scrollbar-thumb\) var\(--scrollbar-track\)/)
  assert.doesNotMatch(css.replace(/@supports \(-moz-appearance: none\)[\s\S]*$/, ''), /scrollbar-(width|color)\s*:/)
  assert.match(css, /\*::-webkit-scrollbar\s*\{\s*width:\s*8px;\s*height:\s*8px/)
  // No screen keeps a coloured scrollbar of its own (hiding one, with transparent or none, is still allowed).
  for (const file of fs.readdirSync(path.join(src, 'styles'))) {
    const text = read(`styles/${file}`)
    for (const line of text.split(/\r?\n/).filter(l => /scrollbar-color/.test(l))) {
      assert.match(line, /transparent/, `${file}: ${line.trim()}`)
    }
  }
})

test('table empty states center in the available region without guessing viewport height', () => {
  const regionStyles = read('styles/TableScrollRegion.module.sass')
  const emptyStyles = read('styles/EmptyState.module.sass')

  assert.doesNotMatch(emptyStyles, /min-height:\s*calc\(100(?:d)?vh/)
  assert.match(regionStyles, /\.canvas[\s\S]*display:\s*flex[\s\S]*flex-direction:\s*column/)
  assert.match(regionStyles, />\s*:global\(table\)[\s\S]*min-height:\s*100%/)
  assert.match(regionStyles, />\s*:global\(table\)\s*>\s*:global\(tbody\)[\s\S]*flex:\s*1\s+1\s+auto/)
  assert.match(emptyStyles, /\.row[\s\S]*min-height:\s*0/)
})

test('table empty states stay centered in the visible horizontal scrollport', () => {
  const emptyCss = sass.compile(path.join(src, 'styles/EmptyState.module.sass')).css
  const region = read('components/TableScrollRegion.jsx')

  // At the compact layout the scrollport is 709px while the table canvas is
  // 900px. The empty row must use the live scrollport width and compensate for
  // scrollLeft; otherwise its centre sits 95.5px offscreen at either edge.
  assert.match(emptyCss, /width:\s*var\(--table-viewport-width(?:,\s*100%)?\)\s*!important/)
  assert.match(emptyCss, /translateX\(var\(--table-scroll-left/)
  assert.match(region, /--table-viewport-width/)
  assert.match(region, /--table-scroll-left/)
})

test('empty-state sentences share one centered wrapping line box', () => {
  const emptyCss = sass.compile(path.join(src, 'styles/EmptyState.module.sass')).css
  const approvalCourses = read('components/ApprovalCoursesTable.jsx')

  assert.match(emptyCss, /\.title,\s*\.hint\s*\{[\s\S]*?width:\s*100%;[\s\S]*?max-width:\s*720px;/)
  assert.match(emptyCss, /\.title,\s*\.hint\s*\{[\s\S]*?overflow-wrap:\s*anywhere;/)
  assert.match(emptyCss, /\.hint\s*\{[\s\S]*?white-space:\s*pre-line;/)
  assert.match(approvalCourses, /review\.\\nNothing is pending for this term and semester\./)
})

test('every retained application table uses TableScrollRegion', () => {
  for (const relative of tableConsumers) {
    assert.match(read(relative), /TableScrollRegion/, `${relative} must use TableScrollRegion`)
  }
})

test('the coverage tables keep their header out of the scrolling rows', () => {
  for (const relative of ['components/CourseCoverage.jsx', 'pages/lpsm/ProgramHead/COAEPView.jsx']) {
    assert.match(read(relative), /HeadBodyTable/, `${relative} must use HeadBodyTable`)
  }
})
