// A comment on topics can point at some of their subtopics (approver comment form, components/ApprovalCommentBox.jsx).
// The server matches each target title against the week's topic and subtopic titles
// (server/controllers/commentController.js, TARGET_LOOKUPS.topics), so a title is all that is sent.

// A week's topics ({ title, subtopics: [{ value }] }) as { 'Topic title': ['Subtopic', …] }.
export const subtopicsByTopic = (topics = []) => Object.fromEntries((topics || [])
  .filter(topic => topic?.title)
  .map(topic => [topic.title, (topic.subtopics || []).map(sub => sub?.value || sub?.title).filter(Boolean)]))

// The subtopics that can be picked: those of the topics already picked, each once.
export const subtopicChoices = (byTopic = {}, pickedTopics = []) =>
  [...new Set(pickedTopics.flatMap(topic => byTopic?.[topic] || []))]

// What the comment targets: per picked topic, its picked subtopics, or the whole topic when none of its own is picked.
export const topicTargets = (pickedTopics = [], pickedSubtopics = [], byTopic = {}) => pickedTopics.flatMap(topic => {
  const own = (byTopic?.[topic] || []).filter(sub => pickedSubtopics.includes(sub))
  return own.length ? own : [topic]
})
