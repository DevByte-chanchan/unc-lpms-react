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
  'components/ConsultantsTable.jsx',
  'components/FacultyTable.jsx',
  'components/ProgramsTable.jsx',
  'components/CourseDetails.jsx',
  'components/ILOs.jsx',
  'components/OutcomeAlignment.jsx',
  'components/CourseCoverage.jsx',
  'components/CriteriaForGrading.jsx',
  'components/ReferenceSummary.jsx',
  'components/SyllabusRevisionsSections.jsx',
  'components/ApprovalSyllabusSections.jsx',
  'pages/ProgramHeadCourseOfferings.jsx',
  'pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx',
  'pages/lpsm/ProgramHead/COAEPView.jsx',
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
  assert.match(styles, /scrollbar-width:\s*thin/)
  assert.match(styles, /scrollbar-color:\s*#5f6f78\s+#e5e9ec/)
  assert.match(styles, /&::-webkit-scrollbar[\s\S]*height:\s*7px/)
  assert.match(styles, /&::-webkit-scrollbar-track[\s\S]*background:\s*#e5e9ec/)
  assert.match(styles, /&::-webkit-scrollbar-thumb[\s\S]*background:\s*#5f6f78/)
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
