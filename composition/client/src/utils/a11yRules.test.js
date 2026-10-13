import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Two accessibility rules for the approver side of the app: a <div> with onClick must have a role=
// (a keyboard or screen reader cannot use it otherwise), and an <input> must have an id= or aria-label=.
// The instructor screens are not scanned: they belong to another module.
const SRC = fileURLToPath(new URL('..', import.meta.url))

const APPROVER_SIDE = [
  /^components\/(Approval|CommentMessage|ReferencePicker|ReferenceSummary|AddReferenceModal|PokeButton|ConsultantsTable|FormSettingsPanel|SideNavigation)/,
  /^pages\/(Approval|CommentRecorder|Dean|DirectorOfLibraries|IndustryConsultant|ProgramHead|VPAA)/,
  /^pages\/lpsm\//
]

// Current violations per file (path relative to src, forward slashes). A file fails only when it has MORE
// violations than listed here, so the rules cannot get worse. Lower a number when you fix one.
const BASELINE = {
  'components/AddReferenceModal.jsx': 1,
  'components/ApprovalCommentBox.jsx': 5,
  'components/ApprovalCoursesTable.jsx': 1,
  'components/ApprovalSyllabusSections.jsx': 5,
  'components/FormSettingsPanel.jsx': 2,
  'components/ReferencePicker.jsx': 2,
  'pages/DeanFaculty.jsx': 4,
  'pages/DeanPrograms.jsx': 4,
  'pages/lpsm/DirectorOfLibraries/AddReference.jsx': 2,
  'pages/lpsm/DirectorOfLibraries/ReferenceLibrary.jsx': 3,
  'pages/ProgramHeadIndustryConsultant.jsx': 2
}

function jsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name)
    return e.isDirectory() ? jsxFiles(p) : e.name.endsWith('.jsx') ? [p] : []
  })
}

// Whole opening tag text from `<name`, skipping `>` inside {...} expressions and quotes.
function tagEnd(src, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < src.length; i++) {
    const c = src[i]
    if (quote) { if (c === quote) quote = null; continue }
    if (c === '"' || c === "'" || (c === '`' && depth > 0)) quote = c
    else if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0) return i
  }
  return src.length
}

function violations(src) {
  const found = []
  for (const m of src.matchAll(/<(div|input)\b/g)) {
    const tag = src.slice(m.index, tagEnd(src, m.index))
    const line = src.slice(0, m.index).split('\n').length
    if (m[1] === 'div' && /\bonClick\s*=/.test(tag) && !/\brole\s*=/.test(tag)) {
      found.push({ line, rule: 'div with onClick needs role=' })
    }
    if (m[1] === 'input' && !/\bid\s*=/.test(tag) && !/\baria-label\s*=/.test(tag)) {
      found.push({ line, rule: 'input needs id= or aria-label=' })
    }
  }
  return found
}

const results = jsxFiles(SRC)
  .map((f) => relative(SRC, f).split(String.fromCharCode(92)).join('/'))
  .filter((file) => APPROVER_SIDE.some((re) => re.test(file)))
  .map((file) => ({ file, list: violations(readFileSync(join(SRC, file), 'utf8')) }))

if (process.env.A11Y_DUMP) {
  console.log(JSON.stringify(results.filter((r) => r.list.length)))
}

test('the scanner finds the approver-side files', () => {
  assert.ok(results.length >= 15, `found only ${results.length} files`)
  assert.ok(results.some((r) => r.file === 'components/ApprovalSyllabusSections.jsx'))
  assert.ok(!results.some((r) => r.file === 'pages/TLAForm.jsx'), 'instructor screens are not scanned')
})

test('the scanner catches both rules and ignores a correct tag', () => {
  assert.equal(violations('<div onClick={go}>x</div>').length, 1)
  assert.equal(violations('<div onClick={go} role="button">x</div>').length, 0)
  assert.equal(violations('<input type="text" />').length, 1)
  assert.equal(violations('<input id="a" />').length, 0)
  assert.equal(violations('<input\n  type="text"\n  aria-label={`x ${y}`}\n/>').length, 0, 'a tag over several lines')
})

test('no approver-side file has more violations than its baseline', () => {
  const worse = results
    .filter((r) => r.list.length > (BASELINE[r.file] ?? 0))
    .map((r) => `${r.file}: ${r.list.length} > baseline ${BASELINE[r.file] ?? 0} (lines ${r.list.map((v) => v.line).join(', ')})`)
  assert.deepEqual(worse, [])
})
