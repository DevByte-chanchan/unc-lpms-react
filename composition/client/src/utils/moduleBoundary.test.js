import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(here, '..')
let checks = 0

const check = (condition, message) => {
  checks += 1
  if (!condition) throw new Error(message)
  console.log(`✓ ${message}`)
}

const read = (relative) => fs.readFileSync(path.join(srcRoot, relative), 'utf8')

const arraFiles = [
  'pages/TOS.jsx',
  'pages/AssignedTOS.jsx',
  'pages/TosPreview.jsx',
  'pages/TosSummary.jsx',
  'pages/QuestionCognitiveMapping.jsx',
  'pages/AssessmentForm.jsx',
  'pages/CriteriaForGradingForm.jsx',
  'components/TosSections.jsx',
  'components/TOSCoursesTable.jsx',
  'styles/TosSections.module.sass',
  'styles/TosPreview.module.sass',
  'styles/QuestionCognitiveMapping.module.sass',
  'styles/CriteriaForGradingForm.module.sass'
]

for (const relative of arraFiles) {
  check(!fs.existsSync(path.join(srcRoot, relative)), `Arra file removed: ${relative}`)
}

const routeSources = [
  'App.jsx',
  'utils/routes.js',
  'utils/session.js',
  'components/SideNavigation.jsx',
  'components/SyllabusRevisionsSections.jsx'
].map(read).join('\n')

for (const token of ['/assigned-tos', '/assignedtos', '/tos/:code', '/assessments/form', 'assignedTos', 'CriteriaForGradingForm.jsx']) {
  check(!routeSources.includes(token), `Removed route token: ${token}`)
}

const approvalSource = read('components/ApprovalSyllabusSections.jsx')
const topicSource = read('pages/TopicForm.jsx')
const appSource = read('App.jsx')
check(approvalSource.includes("/api/comments/by-course"), 'Approver still uses the server-backed course comment API')
check(topicSource.includes("/api/comments/update-resolution"), 'Christian topic form still resolves comments through the API')
check(appSource.includes('path="*"'), 'Unknown removed routes safely return through the retained home flow')

console.log(`\n${checks} module-boundary checks passed.`)
