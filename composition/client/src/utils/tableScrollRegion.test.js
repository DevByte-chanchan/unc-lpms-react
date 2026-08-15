import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
  'pages/lpsm/ProgramHead/COAEPUpload.jsx',
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

test('every retained application table uses TableScrollRegion', () => {
  for (const relative of tableConsumers) {
    assert.match(read(relative), /TableScrollRegion/, `${relative} must use TableScrollRegion`)
  }
})
