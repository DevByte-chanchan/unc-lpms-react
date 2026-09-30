// The module's own spell checker — the one that runs in the browser, with no
// network, and produces the clickable suggestions.
//
// WHY THIS EXISTS. The first version of this feature was `autoCorrect.js`: a
// button that posted the text to LanguageTool. Two problems showed up the
// moment it was used for real:
//
//   1. It could hang. `fetch` has no timeout of its own, so when the service
//      was slow or blocked the button sat on "Checking…" forever with no way
//      out. (Fixed in autoCorrect.js too — see TIMEOUT_MS there.)
//   2. Its offline fallback was a 31-entry list of known misspellings. It had
//      never heard of "Authnetcation", so with no service there was nothing.
//
// And neither version could do the thing people actually expect from a spell
// checker: underline the word and offer you the right one to click. The
// browser does that natively, but the browser will not tell JavaScript what it
// found, so a page cannot read those suggestions or act on them.
//
// So: a real dictionary (utils/wordList.js) plus edit distance.
//
// THE CONSERVATIVE RULE, and the reason this is usable at all. A dictionary
// spell checker's failure mode is flagging correct words it has never heard
// of — and with ~10,000 words that would be constant. So a word is flagged
// ONLY when we can also name a close relative:
//
//     not in the dictionary  AND  within `MAX_DISTANCE` edits of a word that is
//
// An unknown-but-real word ("heteroskedasticity") is usually nowhere near
// anything, so it is left alone. A typo ("Authnetcation") is two edits from
// "authentication", so it is caught with the fix already in hand. The checker
// stays quiet when it does not know, which is the only way a checker like this
// earns the right to underline anything.
//
// Everything here is pure. spellSuggest.test.js runs the whole file under
// plain node.

import { MISSPELLINGS } from './reviewGate.js'
import { isProtectedToken } from './autoCorrect.js'

export const MAX_DISTANCE = 2

// Below this a typo is indistinguishable from an abbreviation, and one- to
// three-letter words are within two edits of half the dictionary.
export const MIN_WORD_LENGTH = 4

// ------------------------------------------------------- the dictionary ---
//
// LOADED ON DEMAND, and this module starts EMPTY.
//
// utils/wordList.js is ~33,000 words. Statically importing it would put a
// quarter of a megabyte into the bundle that every page of the app downloads,
// including the ones with no text box on them. So it arrives through a
// dynamic import() — its own chunk, fetched the first time a comment box is
// mounted, then cached by the browser.
//
// The consequence the UI has to respect: until it arrives there is no
// dictionary, and a checker with no dictionary knows nothing. `isReady()` is
// how the component tells "I checked and found nothing wrong" apart from "I
// have not checked yet" — reporting the second as the first is how a broken
// spell checker looks exactly like a clean sentence.
// Scanning the dictionary for one unknown word costs a few milliseconds, and
// this runs again after every pause in typing — on text that is mostly the
// same words as last time. Keeping the answers across calls turns the second
// pass and every pass after it into lookups. Bounded so a very long session
// cannot grow it without limit.
const SUGGESTION_CACHE = new Map()
const CACHE_LIMIT = 2000

let WORDS = []
let DICTIONARY = new Set()
let loading = null

export const isReady = () => DICTIONARY.size > 0

/** Injectable, so the tests can load the list synchronously. */
export const setWordList = (words = []) => {
    WORDS = Array.isArray(words) ? words : []
    DICTIONARY = new Set(WORDS)
    SUGGESTION_CACHE.clear()
    return isReady()
}

/** Idempotent, and safe to call from several fields at once. */
export const loadWordList = () => {
    if (isReady()) return Promise.resolve(true)
    if (!loading) {
        loading = import('./wordList.js')
            .then(m => setWordList(m.WORDS))
            // A chunk that fails to load must not take the form down with it —
            // the field keeps working, it just has nothing to say.
            .catch(() => { loading = null; return false })
    }
    return loading
}

// The known-misspellings map is authoritative: if a word is in it, that is the
// answer, no distance search needed. It also must NOT be treated as a
// dictionary word — "seperate" is spelled that way often enough to look real.
const KNOWN_BAD = new Map(Object.entries(MISSPELLINGS))

// ------------------------------------------------------ word building ---
//
// A list of 10,000 words is 10,000 words, but English is not: "deployable",
// "misspelled", "rewrite", "scaffolding" and "learnings" are all ordinary and
// none of them are in it. Adding every inflection would multiply the list, and
// a bigger list makes the download worse AND the suggestions worse, because
// "prostores" becomes a candidate for "proctored".
//
// So the dictionary stays small and common, and a word it has not heard of
// gets three more chances before it is called a mistake: strip a standard
// suffix, strip a standard prefix, or split a compound. Each one is checked
// against the same dictionary, so nothing here can invent a word.
//
// These rules only ever ACCEPT — they can turn a flag into silence, never the
// other way round. That direction matters: the worst outcome for this feature
// is underlining correct writing, and every rule below reduces that.

const SUFFIX_RULES = [
    // [suffix, stems to try] — the transforms undo English's spelling changes:
    // dropping a silent e (scale → scalable), y → i (happy → happiness), and
    // doubling a final consonant (run → running).
    ['s', s => [s]],
    ['es', s => [s, s + 'e']],
    ['ed', s => [s, s + 'e', s.slice(0, -1), s.replace(/i$/, 'y')]],
    ['d', s => [s, s + 'e']],
    ['ing', s => [s, s + 'e', s.slice(0, -1)]],
    ['er', s => [s, s + 'e', s.replace(/i$/, 'y')]],
    ['ers', s => [s, s + 'e']],
    ['est', s => [s, s + 'e']],
    ['ly', s => [s, s.replace(/i$/, 'y'), s + 'le']],
    ['ness', s => [s, s.replace(/i$/, 'y')]],
    ['ment', s => [s]],
    ['ments', s => [s]],
    ['able', s => [s, s + 'e', s + 'y']],
    ['ible', s => [s, s + 'e']],
    ['ability', s => [s, s + 'e']],
    ['ful', s => [s]],
    ['less', s => [s]],
    ['ish', s => [s, s + 'e']],
    ['ise', s => [s, s + 'e']],
    ['ize', s => [s, s + 'e']],
    ['ised', s => [s, s + 'e']],
    ['ized', s => [s, s + 'e']],
    ['ising', s => [s, s + 'e']],
    ['izing', s => [s, s + 'e']],
    ['isation', s => [s, s + 'e']],
    ['ization', s => [s, s + 'e']]
]

const PREFIXES = [
    'un', 're', 'non', 'pre', 'post', 'mis', 'over', 'under', 'multi', 'inter',
    'intra', 'sub', 'anti', 'co', 'de', 'dis', 'semi', 'auto', 'micro', 'macro',
    'cross', 'self', 'up', 'out', 'counter'
]

const inDictionary = (w) => DICTIONARY.has(w) && !KNOWN_BAD.has(w)

const hasKnownStem = (w) => {
    for (const [suffix, stems] of SUFFIX_RULES) {
        if (!w.endsWith(suffix) || w.length - suffix.length < 3) continue
        const base = w.slice(0, -suffix.length)
        if (stems(base).some(s => s.length >= 3 && inDictionary(s))) return true
    }
    return false
}

const hasKnownRoot = (w) => {
    for (const prefix of PREFIXES) {
        if (!w.startsWith(prefix) || w.length - prefix.length < 3) continue
        const rest = w.slice(prefix.length)
        if (inDictionary(rest) || hasKnownStem(rest)) return true
    }
    return false
}

// Words that end a "compound" only when two words have been run together by a
// missed space. English compounds do not end in a determiner or a conjunction,
// so "andthe" and "onthe" are typing accidents while "outdated" is a word.
// Without this, "and" + "the" satisfies the rule below perfectly.
const NOT_A_COMPOUND_TAIL = new Set([
    'the', 'and', 'but', 'for', 'nor', 'yet', 'are', 'was', 'were', 'not',
    'its', 'his', 'her', 'our', 'their', 'that', 'this', 'with', 'from'
])

// "timestamp", "dropdown", "checkbox", "stakeholder". Both halves must be real
// words of at least three letters, which is tight enough that the typos this
// checker exists for do not slip through: "assesment" would need "ment" to be
// a word, "syllbus" would need "syll".
const isCompound = (w) => {
    if (w.length < 6) return false
    for (let i = 3; i <= w.length - 3; i++) {
        const head = w.slice(0, i)
        const tail = w.slice(i)
        if (NOT_A_COMPOUND_TAIL.has(tail)) continue
        if (inDictionary(head) && inDictionary(tail)) return true
    }
    return false
}

export const isKnownWord = (word = '') => {
    const w = String(word).toLowerCase()
    if (!w) return false
    // A known misspelling is wrong no matter what the rules below would make
    // of it — this check has to come first.
    if (KNOWN_BAD.has(w)) return false
    if (DICTIONARY.has(w)) return true
    // Possessives and contractions: "student's" is "student" plus punctuation.
    if (w.endsWith("'s") && inDictionary(w.slice(0, -2))) return true
    if (hasKnownStem(w)) return true
    if (hasKnownRoot(w)) return true
    if (isCompound(w)) return true
    return false
}

/**
 * Damerau–Levenshtein distance (with transposition), bounded.
 *
 * Bounded matters: this runs against ~10,000 words on every keystroke. As soon
 * as a whole row of the matrix exceeds `max`, no later row can come back under
 * it, so we can stop and report `max + 1`. That early exit is what makes a
 * full-dictionary scan cheap enough to do live.
 *
 * Transposition is included because it is the single most common typing error
 * — "authnetcation" for "authentication" is one transposition and one deletion.
 * Plain Levenshtein scores that swap as 2, which pushes real typos out of
 * range and makes the checker miss exactly the words it should catch.
 */
export const editDistance = (a = '', b = '', max = Infinity) => {
    const s = String(a)
    const t = String(b)
    if (s === t) return 0
    if (Math.abs(s.length - t.length) > max) return max + 1
    if (!s.length) return t.length
    if (!t.length) return s.length

    let twoAgo = null
    let prev = new Array(t.length + 1)
    let curr = new Array(t.length + 1)
    for (let j = 0; j <= t.length; j++) prev[j] = j

    for (let i = 1; i <= s.length; i++) {
        curr[0] = i
        let rowMin = curr[0]
        for (let j = 1; j <= t.length; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1
            let value = Math.min(
                curr[j - 1] + 1,      // insertion
                prev[j] + 1,          // deletion
                prev[j - 1] + cost    // substitution
            )
            // Transposition of the previous two characters.
            if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
                value = Math.min(value, twoAgo[j - 2] + 1)
            }
            curr[j] = value
            if (value < rowMin) rowMin = value
        }
        if (rowMin > max) return max + 1
        twoAgo = prev
        prev = curr
        curr = new Array(t.length + 1)
    }
    return prev[t.length]
}

// Preserve how the writer capitalised the word: "Authnetcation" should come
// back as "Authentication", not "authentication", or applying the fix silently
// lower-cases the start of their sentence.
export const matchCase = (original = '', replacement = '') => {
    const o = String(original)
    const r = String(replacement)
    if (!o || !r) return r
    if (o === o.toUpperCase() && o.length > 1) return r.toUpperCase()
    if (o[0] === o[0].toUpperCase()) return r[0].toUpperCase() + r.slice(1)
    return r
}

/**
 * Ranked replacements for one word. Empty when nothing is close enough — which
 * is the signal not to flag it at all.
 *
 * Ranking is distance first, then length similarity, then dictionary order
 * (which is frequency order, most common first) — so a one-edit fix always
 * beats a two-edit one, and among equals the commoner word wins.
 */
export const suggest = (word = '', { limit = 4, maxDistance = MAX_DISTANCE } = {}) => {
    const raw = String(word)
    const lower = raw.toLowerCase()
    if (!lower) return []

    const known = KNOWN_BAD.get(lower)
    if (known) return [matchCase(raw, known)]

    if (!isReady()) return []
    if (isKnownWord(lower)) return []
    if (lower.length < MIN_WORD_LENGTH) return []

    // A short word only gets one edit of slack — at distance 2, "form" is as
    // close to "from" as it is to "fort", "farm", "foam" and forty others.
    const budget = lower.length <= 5 ? Math.min(1, maxDistance) : maxDistance

    const found = []
    for (let i = 0; i < WORDS.length; i++) {
        const candidate = WORDS[i]
        if (Math.abs(candidate.length - lower.length) > budget) continue
        const d = editDistance(lower, candidate, budget)
        if (d <= budget) found.push({ word: candidate, d, rank: i })
        if (d === 0) break
    }

    found.sort((a, b) => a.d - b.d || a.rank - b.rank)
    return found.slice(0, limit).map(f => matchCase(raw, f.word))
}

/**
 * Is this word capitalised in a position where the capital is doing work —
 * i.e. it is not simply the first word of a sentence?
 *
 * PROPER NOUNS ARE THE OTHER HALF OF THE CONSERVATIVE RULE. A dictionary of
 * ~10,000 words does not contain "Sommerville", "Silberschatz", or the name of
 * whoever wrote the comment, and it never will. Left alone, the checker
 * underlines every author, publisher, campus and person in the module — in a
 * REFERENCE LIBRARY, which is mostly names. "Pearson" is one edit from
 * "person", so it would be flagged with a confident wrong answer.
 *
 * So a capital that is not sentence-initial is read as "this is a name" and
 * the word is left alone. The cost is a capitalised typo mid-sentence going
 * unnoticed; typos are overwhelmingly lower-case, and LanguageTool catches
 * those when it is reachable, because it can see the sentence.
 */
const isMidSentenceCapital = (source, index, word) => {
    if (word[0] !== word[0].toUpperCase() || word[0] === word[0].toLowerCase()) return false
    // Walk back over whitespace; a sentence-ender or the very start means the
    // capital is just how sentences begin.
    let i = index - 1
    while (i >= 0 && /\s/.test(source[i])) i--
    if (i < 0) return false
    return !'.!?:;•-–—'.includes(source[i])
}

/**
 * Every word in `text` that looks wrong, with offsets into the original
 * string so the caller can underline or splice it.
 *
 * @returns {Array<{offset, length, word, suggestions, message, source}>}
 */
const cachedSuggest = (word) => {
    const key = word.toLowerCase()
    if (SUGGESTION_CACHE.has(key)) return SUGGESTION_CACHE.get(key)
    const value = suggest(key)
    if (SUGGESTION_CACHE.size >= CACHE_LIMIT) SUGGESTION_CACHE.clear()
    SUGGESTION_CACHE.set(key, value)
    return value
}

export const findIssues = (text = '') => {
    // No dictionary, no opinion. Returning [] here is what makes `isReady()`
    // the component's business rather than this function's.
    if (!isReady()) return []
    const source = String(text ?? '')
    const issues = []
    // Letters, apostrophes and internal hyphens — so "CO2-ILO2" arrives whole
    // and can be recognised as a protected token instead of being split into
    // two mystery words.
    const re = /[A-Za-z][A-Za-z'-]*/g
    let m

    while ((m = re.exec(source)) !== null) {
        const word = m[0].replace(/[-']+$/, '')
        if (!word) continue
        if (isProtectedToken(word)) continue
        if (isProtectedToken(m[0])) continue
        if (word.length < MIN_WORD_LENGTH) continue

        const key = word.toLowerCase()
        if (isKnownWord(key)) continue
        // A known misspelling is still a known misspelling even capitalised.
        if (!KNOWN_BAD.has(key) && isMidSentenceCapital(source, m.index, word)) continue

        const suggestions = cachedSuggest(key).map(s => matchCase(word, s))
        // THE CONSERVATIVE RULE: no near neighbour, no complaint.
        if (!suggestions.length) continue

        issues.push({
            offset: m.index,
            length: word.length,
            word,
            suggestions,
            message: `“${word}” is not in the dictionary.`,
            source: 'local'
        })
    }
    return issues
}

/**
 * Fold LanguageTool's matches into our own list.
 *
 * The service wins where the two overlap: it read the sentence, we only read
 * the word, so on "their are three" it can say "there" and we cannot. Ours
 * fill in everywhere it said nothing — which is the whole text when it is
 * unreachable.
 */
export const mergeIssues = (localIssues = [], serviceMatches = [], text = '') => {
    const source = String(text ?? '')
    const fromService = (Array.isArray(serviceMatches) ? serviceMatches : [])
        .filter(m => typeof m?.offset === 'number' && typeof m?.length === 'number')
        .filter(m => m.offset >= 0 && m.length > 0 && m.offset + m.length <= source.length)
        .filter(m => !isProtectedToken(source.slice(m.offset, m.offset + m.length)))
        .map(m => ({
            offset: m.offset,
            length: m.length,
            word: source.slice(m.offset, m.offset + m.length),
            suggestions: (m.replacements || []).slice(0, 4).map(r => r.value).filter(Boolean),
            message: m.message || 'This may be incorrect.',
            source: 'service'
        }))
        .filter(m => m.suggestions.length > 0)

    const overlaps = (a, b) => a.offset < b.offset + b.length && b.offset < a.offset + a.length
    const kept = [...fromService]
    ;(Array.isArray(localIssues) ? localIssues : []).forEach(local => {
        if (!fromService.some(s => overlaps(local, s))) kept.push(local)
    })

    return kept.sort((a, b) => a.offset - b.offset)
}

/**
 * Split text into runs for rendering, so the view layer never does arithmetic
 * on offsets. Every character of the input appears in exactly one segment, in
 * order — that invariant is what the tests check, because an off-by-one here
 * shows up as a highlight sliding one letter to the left.
 *
 * @returns {Array<{text, issue: object|null}>}
 */
export const segmentText = (text = '', issues = []) => {
    const source = String(text ?? '')
    const ordered = [...(Array.isArray(issues) ? issues : [])]
        .filter(i => i && i.offset >= 0 && i.length > 0 && i.offset + i.length <= source.length)
        .sort((a, b) => a.offset - b.offset)

    const segments = []
    let cursor = 0
    ordered.forEach(issue => {
        if (issue.offset < cursor) return   // overlapping — already covered
        if (issue.offset > cursor) segments.push({ text: source.slice(cursor, issue.offset), issue: null })
        segments.push({ text: source.slice(issue.offset, issue.offset + issue.length), issue })
        cursor = issue.offset + issue.length
    })
    if (cursor < source.length) segments.push({ text: source.slice(cursor), issue: null })
    return segments
}

/** Replace one issue's span. Pure, so applying a suggestion is testable. */
export const applySuggestion = (text = '', issue, replacement = '') => {
    const source = String(text ?? '')
    if (!issue || typeof issue.offset !== 'number' || typeof issue.length !== 'number') return source
    if (issue.offset < 0 || issue.length <= 0 || issue.offset + issue.length > source.length) return source
    return source.slice(0, issue.offset) + replacement + source.slice(issue.offset + issue.length)
}

/** The issue under a caret position, or null. Used for click-to-open. */
export const issueAt = (issues = [], caret = 0) =>
    (Array.isArray(issues) ? issues : []).find(i =>
        caret >= i.offset && caret <= i.offset + i.length) || null

export default {
    MAX_DISTANCE,
    MIN_WORD_LENGTH,
    isReady,
    setWordList,
    loadWordList,
    isKnownWord,
    editDistance,
    matchCase,
    suggest,
    findIssues,
    mergeIssues,
    segmentText,
    applySuggestion,
    issueAt
}
