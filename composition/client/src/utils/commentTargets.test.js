import test from 'node:test'
import assert from 'node:assert/strict'
import { subtopicsByTopic, subtopicChoices, topicTargets } from './commentTargets.js'
import { weekRowsOf } from './weeklyCoverage.js'

const topics = [
  { title: 'Classes', subtopics: [{ id: 1, value: 'Constructors' }, { id: 2, value: 'Fields' }] },
  { title: 'Inheritance', subtopics: [{ id: 3, value: 'Overriding' }] },
  { title: 'Review', subtopics: [] },
]
const byTopic = subtopicsByTopic(topics)

test('subtopics are grouped by their topic', () => {
  assert.deepEqual(byTopic, { Classes: ['Constructors', 'Fields'], Inheritance: ['Overriding'], Review: [] })
})

test('only the picked topics offer their subtopics', () => {
  assert.deepEqual(subtopicChoices(byTopic, ['Classes']), ['Constructors', 'Fields'])
  assert.deepEqual(subtopicChoices(byTopic, []), [])
})

test('a picked subtopic narrows its own topic only; a topic with none picked stays whole', () => {
  assert.deepEqual(topicTargets(['Classes', 'Inheritance'], ['Fields'], byTopic), ['Fields', 'Inheritance'])
  assert.deepEqual(topicTargets(['Classes'], [], byTopic), ['Classes'])
  assert.deepEqual(topicTargets(['Review'], ['Fields'], byTopic), ['Review'], 'a subtopic of an unpicked topic is ignored')
})

test('the week rows carry each topic’s subtopics for the comment form', () => {
  const rows = weekRowsOf({ courseOutcomes: [{ coNumber: 1, ilos: [], weeks: [{ week_id: 9, weekNumberInCo: 1, topics }] }] })
  assert.deepEqual(rows[0].subtopics, byTopic)
  assert.deepEqual(rows[0].topics, ['Classes', 'Inheritance', 'Review'])
})
