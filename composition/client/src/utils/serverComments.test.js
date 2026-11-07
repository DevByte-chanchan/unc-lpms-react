import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { toPanelComments, isDuplicateComment, LEGACY_STORAGE_KEY } from './serverComments.js'

const row = (over = {}) => ({
  comment_id: 7, commenter_role: 'LIBRARY_DIRECTOR', commenter_name: 'DELA CRUZ, ANA', message: '[Requested revision] Use a newer edition',
  resolved_status: 0, comment_for: 'references', target_title: 'Clean Architecture', createdAt: '2026-11-07T08:00:00.000Z',
  co_no: 1, ilo_no: 2, ...over
})

test('a card names the author the server recorded, and the role in words', () => {
  const [card] = toPanelComments([row()], 'BIT213L')
  assert.equal(card.reviewer, 'DELA CRUZ, ANA')
  assert.equal(card.role, 'Director of Libraries')
  assert.equal(card.courseOutcome, 'CO1')
  assert.equal(card.ilo, 'CO1-ILO2')
  assert.equal(card.coverageType, 'References')
  assert.equal(card.coverageDetail, 'Clean Architecture')
  assert.equal(card.id, 'server-7')
  assert.equal(card.resolved, false)
  assert.equal(card.comment, 'Use a newer edition', 'the type tag is not shown as text')
  assert.equal(card.commentType, 'revision')
})

test('an old row without a name shows the role, never a demo name', () => {
  const [card] = toPanelComments([row({ commenter_name: null, commenter_role: 'PROGRAM_HEAD' })])
  assert.equal(card.reviewer, 'Program Head')
})

test('one comment on several targets is one card, not one per target', () => {
  const cards = toPanelComments([row({ target_title: 'A' }), row({ target_title: 'B' }), row({ comment_id: 8, target_title: 'C' })])
  assert.equal(cards.length, 2)
  assert.deepEqual(cards[0].coverageDetail, ['A', 'B'])
  assert.equal(cards[1].coverageDetail, 'C')
})

test('a duplicate is the same words on the same CO, ILO and target, whatever the type tag', () => {
  const existing = toPanelComments([row()])
  const same = { text: 'use a newer edition ', courseOutcome: 'CO1', ilo: 'CO1-ILO2', coverageType: 'References', coverageDetail: ['Clean Architecture'] }
  assert.equal(isDuplicateComment(existing, same), true)
  assert.equal(isDuplicateComment(existing, { ...same, ilo: 'CO1-ILO3' }), false)
  assert.equal(isDuplicateComment(existing, { ...same, text: 'Something else' }), false)
})

test('the plan page keeps no comments in the browser: it only clears the old copy', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const page = fs.readFileSync(path.join(here, '../components/ApprovalSyllabusSections.jsx'), 'utf8')
  const box = fs.readFileSync(path.join(here, '../components/ApprovalCommentBox.jsx'), 'utf8')
  assert.equal(LEGACY_STORAGE_KEY, 'approval_comments_v1')
  assert.doesNotMatch(page, /approval_comments_v1/)
  assert.doesNotMatch(page, /localStorage\.setItem/)
  assert.match(page, /localStorage\.removeItem\(LEGACY_STORAGE_KEY\)/)
  assert.doesNotMatch(box, /approval_comments_v1/)
  // The plan is returned only after the comments were saved.
  assert.match(page, /saved \+= 1[\s\S]*recordWorkflowAction\('RETURNED'\)/)
})
