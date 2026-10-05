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

test('each ILO row lists its level, topics, TLAs and assessments with weights', () => {
  const html = buildCoaepHtml(record({ approved: true }), null)
  assert.match(html, /Demonstrative \(D\)<br>50% of course/)
  assert.match(html, /<li>Wireframes<\/li><li>Prototypes<\/li>/)
  assert.match(html, /<li>Sketching \(In-class\)<\/li>/)
  assert.match(html, /<li>Quiz, Lecture Notes — Prelim, 12\.5%<\/li>/)
  assert.match(html, /<li>Project — Final, 37\.5%<\/li>/)
  assert.match(html, /At least 85% of enrolled students/)
})

test('text from the learning plan is escaped', () => {
  const evil = record({ approved: true })
  evil.cos[0].ilos = [{ ...ilo, topics: ['<script>alert(1)</script>'] }]
  assert.doesNotMatch(buildCoaepHtml(evil, null), /<script>alert/)
})
