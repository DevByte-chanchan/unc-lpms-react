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

test('an approved COAEP has no draft banner or watermark and shows the Program Head as approver', () => {
  const html = buildCoaepHtml(record({ approved: true, approvedBy: 'DANILA, JUNAR', approvedByDate: 'June 28, 2026' }), null)
  assert.doesNotMatch(html, /DRAFT/)
  assert.match(html, /DANILA, JUNAR/)
  assert.match(html, /June 28, 2026/)
  assert.match(html, /BIT313L - HCI \(Revision 2\)/)
})

const pagesOf = (html) => html.split('<div class="page">').slice(1)

test('a draft COAEP carries a banner and a watermark on every page', () => {
  const many = record({ approved: false })
  many.cos = Array.from({ length: 6 }, (_, i) => ({ statement: `Outcome ${i + 1}`, ilos: [ilo, ilo, ilo] }))
  const html = buildCoaepHtml(many, null)
  const pages = pagesOf(html).length
  assert.ok(pages >= 2)
  assert.equal(html.match(/DRAFT – NOT APPROVED\./g).length, pages)
  assert.equal(html.match(/rotate\(-28deg\)/g).length, pages)
})

test('short course outcomes share a page; every CO is shown once, in order, never split', () => {
  const two = record({ approved: true })
  two.cos.push({ statement: 'Evaluate interfaces', ilos: [ilo] })
  assert.equal(pagesOf(buildCoaepHtml(two, null)).length, 1)

  const many = record({ approved: true })
  many.cos = Array.from({ length: 8 }, (_, i) => ({ statement: `Outcome ${i + 1}`, ilos: [ilo, ilo, ilo] }))
  const pages = pagesOf(buildCoaepHtml(many, null))
  assert.ok(pages.length > 1 && pages.length < 8)
  const numbers = pages.flatMap(p => [...p.matchAll(/font-weight:bold;" rowspan="3">(\d+)</g)].map(m => Number(m[1])))
  assert.deepEqual(numbers, [1, 2, 3, 4, 5, 6, 7, 8])
  assert.match(pages.at(-1), /Prepared by:/)
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
