// Converts a CO's flat topic list into the structured format stored in the DB:
// [{ title, subtopics: [..] }]. Accepts a JSON string or an array; items that
// are already structured are kept as-is.
const DEFAULT_SUBTOPICS = [
    'Key terms and definitions',
    'Core principles',
    'Applications and examples'
];

export function structureTopics(raw) {
    let list = raw;
    if (typeof raw === 'string') {
        try { list = JSON.parse(raw); } catch { list = []; }
    }
    if (!Array.isArray(list)) return JSON.stringify([]);
    return JSON.stringify(list.map(t => (
        typeof t === 'string'
            ? { title: t, subtopics: DEFAULT_SUBTOPICS }
            : t
    )));
}
