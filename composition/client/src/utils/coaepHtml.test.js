import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCoaepHtml } from './syllabusPdfHtml.js'

const ilo = {
  outcome: 'Propose a UI design.',
  level: 'D',
  levelName: 'Demonstrative',
  levelWeight: 50,
  topics: ['Wireframes', 'Prototypes'],
  tlas: [{ name: 'Sketching', phase: 'In-class' }],
  assessments: [{ name: 'Quiz, Lecture Notes', periodLabel: 'Prelim', weight: '12.5' }, { name: 'Project', periodLabel: 'Final', weight: '37.5' }],
  performanceTarget: 'At least 85% of enrolled students with a rating of at least 70% of the total score'
}
const record = (extra) => ({
  header: { course: 'BIT313L - HCI (Revision 2)' },
  cos: [{ statement: 'Design interfaces', ilos: [ilo] }],
  performanceTarget: 'default target',
  ...extra
})

test('an approved COAEP has no draft banner or watermark and shows the approval date', () => {
  const html = buildCoaepHtml(record({ approved: true, approvalDate: 'June 28, 2026' }), null)
  assert.doesNotMatch(html, /DRAFT/)
  assert.match(html, /June 28, 2026/)
  assert.match(html, /BIT313L - HCI \(Revision 2\)/)
})

test('a draft COAEP carries a banner and a watermark on every page', () => {
  const twoCos = record({ approved: false })
  twoCos.cos.push({ statement: 'Evaluate interfaces', ilos: [ilo] })
  const html = buildCoaepHtml(twoCos, null)
  const pages = html.match(/<div class="page">/g).length
  assert.equal(pages, 2)
  assert.equal(html.match(/DRAFT – NOT APPROVED\./g).length, pages)
  assert.equal(html.match(/rotate\(-28deg\)/g).length, pages)
})

test('a COAEP with no approval flag is never rendered as final', () => {
  assert.match(buildCoaepHtml(record({}), null), /DRAFT – NOT APPROVED/)
})

test('the table has the official form\'s columns: statement, ILO, assessment tool, performance target', () => {
  const html = buildCoaepHtml(record({ approved: true }), null)
  assert.match(html, /colspan="2">Course Outcome Statement/)
  assert.match(html, />Intended Learning Outcome</)
  assert.match(html, />Assessment Tool</)
  assert.match(html, />Performance Target</)
  assert.doesNotMatch(html, /Level \/ Weight|>Topics<|>TLAs</)
  assert.match(html, /<li>Quiz, Lecture Notes<\/li>/)
  assert.match(html, /<li>Project<\/li>/)
  assert.match(html, /At least 85% of enrolled students/)
})

test('text from the learning plan is escaped', () => {
  const evil = record({ approved: true })
  evil.cos[0].ilos = [{ ...ilo, outcome: '<script>alert(1)</script>', assessments: [{ name: '<img src=x onerror=alert(1)>' }] }]
  const html = buildCoaepHtml(evil, null)
  assert.doesNotMatch(html, /<script>alert/)
  assert.doesNotMatch(html, /<img src=x/)
})
