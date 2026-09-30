// node src/utils/spellSuggest.test.js
//
// The whole spell checker is pure, so the whole thing is tested here — the
// distance function, the ranking, the conservative rule that decides what gets
// underlined at all, the offsets the highlight is drawn from, and the splice
// that applies a suggestion. The component only renders what these return.

import {
    MIN_WORD_LENGTH, isKnownWord, editDistance, matchCase, suggest,
    findIssues, mergeIssues, segmentText, applySuggestion, issueAt,
    isReady, setWordList
} from './spellSuggest.js'
import { WORDS } from './wordList.js'

// The dictionary is a dynamic import() in the app, so that the ~33,000 words
// are their own chunk and not part of the bundle every page downloads. Here we
// hand it over synchronously and get on with it.
setWordList(WORDS)

let passed = 0
const test = (name, fn) => {
    try { fn(); passed++; console.log(`✓ ${name}`) }
    catch (error) { console.error(`✗ ${name}\n  ${error.message}`); process.exitCode = 1 }
}
const assert = (condition, message) => { if (!condition) throw new Error(message) }

/* --------------------------------------------------------- the load --- */

test('with no dictionary the checker says nothing at all', () => {
    // The dictionary arrives over the network. Until it does, "found nothing"
    // and "have not looked" must not be the same answer — a component that
    // cannot tell them apart shows a confident "No spelling problems" over
    // text full of mistakes, which is exactly how this looked when the chunk
    // failed to load.
    setWordList([])
    assert(isReady() === false, 'an empty dictionary is not ready')
    assert(findIssues('The syllbus has bad refernces.').length === 0, 'no dictionary, no findings')
    assert(suggest('syllbus').length === 0, 'no dictionary, no suggestions')
    // Except the known-misspellings map, which is bundled and always there.
    assert(suggest('teh')[0] === 'the', 'the built-in list still works')
    setWordList(WORDS)
    assert(isReady() === true, 'and it comes back when the words arrive')
})

/* ------------------------------------------------------------ distance -- */

test('edit distance counts a transposition as one mistake, not two', () => {
    assert(editDistance('teh', 'the') === 1, 'a swap of two letters is one typing mistake')
    assert(editDistance('form', 'from') === 1, 'so is this one')
    // Plain Levenshtein would say 2 for each, which pushes real typos out of
    // range and is why transposition is in the algorithm at all.
    assert(editDistance('authnetcation', 'authentication') === 2,
        `expected 2, got ${editDistance('authnetcation', 'authentication')}`)
})

test('edit distance is the usual thing for the other three operations', () => {
    assert(editDistance('cat', 'cat') === 0, 'identical is zero')
    assert(editDistance('cat', 'cast') === 1, 'insertion')
    assert(editDistance('cast', 'cat') === 1, 'deletion')
    assert(editDistance('cat', 'cot') === 1, 'substitution')
    assert(editDistance('', 'abc') === 3, 'from empty is the length')
    assert(editDistance('abc', '') === 3, 'to empty is the length')
})

test('the distance ceiling short-circuits without changing the answer below it', () => {
    // The cap is what makes scanning 10,000 words per unknown word affordable.
    // It must never change a result that was already under the cap.
    const pairs = [['cat', 'cot'], ['teh', 'the'], ['syllbus', 'syllabus'], ['abc', 'xyz'], ['a', 'abcdef']]
    for (const [a, b] of pairs) {
        const exact = editDistance(a, b)
        const capped = editDistance(a, b, 2)
        if (exact <= 2) assert(capped === exact, `${a}/${b}: capped ${capped} != exact ${exact}`)
        else assert(capped > 2, `${a}/${b}: distance is ${exact} but capped said ${capped}`)
    }
})

/* ----------------------------------------------------------- suggesting -- */

test('the word from the screenshot gets the right answer', () => {
    // "Authnetcation" — reported by a reviewer as the case the checker missed.
    const s = suggest('Authnetcation')
    assert(s[0] === 'Authentication', `expected Authentication first, got ${JSON.stringify(s)}`)
})

test('suggestions keep the writer’s capitalisation', () => {
    assert(suggest('Assesment')[0] === 'Assessment', 'a leading capital is kept')
    assert(suggest('assesment')[0] === 'assessment', 'lower case stays lower case')
    assert(matchCase('WORD', 'thing') === 'THING', 'all caps stays all caps')
    assert(matchCase('Word', 'thing') === 'Thing', 'title case stays title case')
    assert(matchCase('word', 'thing') === 'thing', 'lower case stays lower case')
})

test('the closest and commonest suggestion comes first', () => {
    const s = suggest('refernces')
    assert(s[0] === 'references', `expected references first, got ${JSON.stringify(s)}`)
    assert(s.length > 1, 'the near misses are offered too')
})

test('a correctly spelled word gets no suggestions at all', () => {
    for (const word of ['syllabus', 'assessment', 'reference', 'curriculum', 'instructor', 'authentication']) {
        assert(isKnownWord(word), `${word} should be in the dictionary`)
        assert(suggest(word).length === 0, `${word} should not be corrected`)
    }
})

test('a word the dictionary knows is wrong is corrected even though it looks real', () => {
    // These are in the module's MISSPELLINGS map. They must NOT count as
    // dictionary words just because someone put them in a word list.
    assert(!isKnownWord('seperate'), 'seperate is a misspelling, not a word')
    assert(suggest('seperate')[0] === 'separate', 'and it has one right answer')
    assert(suggest('teh')[0] === 'the', 'even though it is under the length floor')
})

/* ------------------------------------------------ built, not listed ----- */
//
// The dictionary holds ~10,000 common words. English builds far more from
// them, and a bigger list would make the download worse AND the suggestions
// worse (with 40,000 words, "prostores" becomes a candidate for "proctored").
// So a word the list has not heard of gets three more chances before it is
// called a mistake: a standard suffix, a standard prefix, or a compound.

test('a word built from a known one with a normal ending is accepted', () => {
    const built = [
        'deployable', 'testable', 'scalable', 'maintainable',   // -able, with and without a dropped e
        'learnings', 'reviewers', 'submissions',                // plurals
        'uploaded', 'submitting', 'aligning',                   // -ed, -ing, doubled consonants
        'clearly', 'happiness', 'assessments'
    ]
    for (const word of built) {
        assert(isKnownWord(word), `${word} should be recognised without being listed`)
        assert(findIssues(`It is ${word} now.`).length === 0, `${word} was flagged`)
    }
})

test('a word built with a normal prefix is accepted', () => {
    for (const word of ['rewrite', 'misspelled', 'nonstandard', 'interdisciplinary', 'misaligned', 'unproctored', 'overdue']) {
        assert(isKnownWord(word), `${word} should be recognised`)
    }
})

test('a compound of two real words is accepted', () => {
    // None of these are in the word list — they are two words that are.
    for (const word of ['timestamp', 'dropdown', 'checkbox', 'stakeholder', 'outdated', 'gradebook']) {
        assert(isKnownWord(word), `${word} should be recognised as a compound`)
        assert(findIssues(`The ${word} is wrong.`).length === 0, `${word} was flagged`)
    }
})

// THE LIMIT ON ALL THREE. Rules that accept words must not accept typos — that
// would trade a visible false alarm for a silent miss, which is worse, because
// nobody can see it happening.
test('none of those rules let an actual typo through', () => {
    const typos = [
        'authnetcation', 'syllbus', 'refernces', 'assesment', 'curriculam',
        'recieve', 'seperate', 'definately', 'enviroment', 'knowlege',
        'studnets', 'succesful', 'databse', 'sylabus', 'acheive', 'begining'
    ]
    for (const typo of typos) {
        assert(!isKnownWord(typo), `"${typo}" was accepted as a real word`)
        assert(suggest(typo).length > 0, `"${typo}" was flagged with no suggestion to offer`)
    }
})

test('two words run together are not passed off as a compound', () => {
    // "and" + "the" fits the compound rule perfectly, which is why the rule
    // refuses a tail that is a determiner or a conjunction: no real compound
    // ends in one.
    for (const merged of ['andthe', 'onthe', 'inthe', 'ofthe', 'forthe', 'withthe']) {
        assert(!isKnownWord(merged), `"${merged}" was accepted as a real word`)
    }
    // KNOWN LIMIT, stated rather than hidden: a missed space is usually more
    // than two edits from any single word, so there is no suggestion to offer
    // and the conservative rule leaves it un-underlined. Catching these needs
    // the sentence, which is what LanguageTool is for. What must never happen
    // is the checker calling them correct — that is what the assertions above
    // pin down.
    assert(suggest('onthe').length === 0, 'no suggestion is expected here')
})

/* ---------------------------------------------- the conservative rule --- */

// THE POINT OF THE WHOLE DESIGN. A ~10,000-word dictionary does not contain
// every real word, so "not in the dictionary" cannot be the test — it would
// underline correct writing all day and be turned off within a minute. A word
// is flagged only when a close relative can be named.

test('an unknown word with no near neighbour is left alone', () => {
    const unknown = ['heteroskedasticity', 'oligopsony', 'zzzqxk', 'Balingasag']
    for (const word of unknown) {
        assert(!isKnownWord(word.toLowerCase()), `${word} is genuinely not in the dictionary`)
        const issues = findIssues(`The ${word} case.`)
        assert(issues.length === 0, `${word} should not be flagged: ${JSON.stringify(issues)}`)
    }
})

test('course codes, outcome ids and acronyms are never flagged', () => {
    const text = 'Align CO2-ILO2 in BSCS 511 with the TOS and the CHED CMO, per BIT321L.'
    assert(findIssues(text).length === 0, JSON.stringify(findIssues(text)))
})

test('real approver comments produce no false alarms', () => {
    const clean = [
        'Please align CO2 with ILO2 and cite the textbook chapter for each topic.',
        'The summative assessment weight looks inconsistent with the grading criteria.',
        'Kindly rephrase ILO 2; "understand" is not measurable. Suggest "differentiate".',
        'Refer to Sommerville, Software Engineering, 10th edition, Pearson.',
        'Add prerequisites and corequisites, and state the attendance policy clearly.',
        'Ang syllabus ay kailangan ng rebisyon sa bahagi ng pagtatasa.',
        'Maria Santos approved this. Juan dela Cruz did not.'
    ]
    for (const line of clean) {
        const issues = findIssues(line)
        assert(issues.length === 0, `false alarm in "${line}": ${issues.map(i => i.word).join(', ')}`)
    }
})

test('a capital in the middle of a sentence is read as a name, not a typo', () => {
    // The isolating cases are the module's OWN demo accounts, because they are
    // names no dictionary will ever hold and they each sit one or two edits
    // from a common word: DANILA is one substitution from "Manila", NORTON two
    // from "north". Without the proper-noun rule the checker underlines the
    // approvers by name and offers to rename them.
    for (const line of ['Approved by Danila today.', 'Assigned to Norton this term.', 'Endorsed by Junar and Agnes.']) {
        const issues = findIssues(line)
        assert(issues.length === 0, `flagged a name in "${line}": ${issues.map(i => `${i.word}→${i.suggestions[0]}`).join(', ')}`)
    }
    // "Pearson" is one edit from "person" — in a reference library, underlining
    // every publisher and author would make the checker useless.
    assert(findIssues('Published by Pearson in 2020.').length === 0, 'a mid-sentence capital is a name')
    // But at the start of a sentence a capital is just how sentences begin, so
    // a typo there is still caught.
    assert(findIssues('Authnetcation is missing.').length === 1, 'a sentence-initial typo is still caught')
    // And a known misspelling is wrong wherever it appears.
    assert(findIssues('The word Seperate appears twice.').length === 1, 'a known misspelling beats the name rule')
})

test('very short words are left alone', () => {
    // At two edits, a four-letter word is close to dozens of others; correcting
    // "abbr" to "abbot" would be confident and wrong.
    for (let n = 1; n < MIN_WORD_LENGTH; n++) {
        const word = 'q'.repeat(n)
        assert(findIssues(`A ${word} here.`).length === 0, `${word} (${n} letters) should be left alone`)
    }
})

/* -------------------------------------------------------------- offsets -- */

test('offsets point at the flagged word and nowhere else', () => {
    const text = 'The syllbus has bad refernces.'
    const issues = findIssues(text)
    assert(issues.length === 2, `expected 2 issues, got ${issues.length}`)
    for (const issue of issues) {
        const slice = text.slice(issue.offset, issue.offset + issue.length)
        assert(slice === issue.word, `offset ${issue.offset} points at "${slice}", not "${issue.word}"`)
    }
    assert(issues[0].offset < issues[1].offset, 'issues come back in reading order')
})

test('offsets survive newlines, punctuation and repeated words', () => {
    const text = 'First: assesment.\n\nSecond: assesment again, and syllbus too.'
    const issues = findIssues(text)
    assert(issues.length === 3, `expected 3, got ${issues.length}`)
    for (const issue of issues) {
        assert(text.slice(issue.offset, issue.offset + issue.length) === issue.word,
            `misaligned at ${issue.offset}`)
    }
    // Both copies of the same word are reported — highlighting only the first
    // would leave the second silently underlined-adjacent and unfixable.
    assert(issues.filter(i => i.word === 'assesment').length === 2, 'every occurrence is its own issue')
})

/* ------------------------------------------------------------ segments -- */

test('segments reassemble into exactly the original text', () => {
    const samples = [
        'The syllbus has bad refernces.',
        'assesment',
        '',
        'no problems at all here',
        'line one\nline two with syllbus\n\nline four'
    ]
    for (const text of samples) {
        const segs = segmentText(text, findIssues(text))
        assert(segs.map(s => s.text).join('') === text, `segments lost text for "${text}"`)
    }
})

test('segments mark the issue spans and only those', () => {
    const text = 'The syllbus has bad refernces.'
    const segs = segmentText(text, findIssues(text))
    const marked = segs.filter(s => s.issue).map(s => s.text)
    assert(JSON.stringify(marked) === JSON.stringify(['syllbus', 'refernces']),
        `marked the wrong spans: ${JSON.stringify(marked)}`)
})

test('overlapping issues do not duplicate or drop text', () => {
    const text = 'aaaa bbbb'
    const overlapping = [
        { offset: 0, length: 4, word: 'aaaa', suggestions: ['x'] },
        { offset: 2, length: 4, word: 'aa b', suggestions: ['y'] }
    ]
    const segs = segmentText(text, overlapping)
    assert(segs.map(s => s.text).join('') === text, 'text must survive overlapping issues')
    assert(segs.filter(s => s.issue).length === 1, 'the second, overlapping issue is dropped')
})

test('an issue pointing outside the text is ignored rather than throwing', () => {
    const text = 'short'
    const segs = segmentText(text, [{ offset: 99, length: 4 }, { offset: 0, length: 999 }, { offset: -1, length: 2 }])
    assert(segs.map(s => s.text).join('') === text, 'text must survive nonsense offsets')
    assert(segs.every(s => !s.issue), 'none of those should have been marked')
})

/* -------------------------------------------------------------- merging -- */

test('the service wins where it and the local checker overlap', () => {
    const text = 'Their are three refernces.'
    const local = findIssues(text)
    const service = [{
        offset: 0, length: 5,
        replacements: [{ value: 'There' }],
        message: 'Did you mean "There are"?'
    }]
    const merged = mergeIssues(local, service, text)
    const atZero = merged.filter(i => i.offset === 0)
    assert(atZero.length === 1, 'one issue per span')
    assert(atZero[0].source === 'service', 'the service read the sentence; we only read the word')
    assert(merged.some(i => i.word === 'refernces'), 'and our findings elsewhere are kept')
})

test('service matches with no replacement, or on a protected token, are dropped', () => {
    const text = 'Check CO2-ILO2 now.'
    const service = [
        { offset: 6, length: 8, replacements: [{ value: 'CO2-ILO' }], message: 'spelling' },
        { offset: 0, length: 5, replacements: [], message: 'no idea' }
    ]
    const merged = mergeIssues([], service, text)
    assert(merged.length === 0, `both should have been dropped: ${JSON.stringify(merged)}`)
})

test('merged issues come back in reading order', () => {
    const text = 'one assesment two syllbus three'
    const merged = mergeIssues(findIssues(text), [
        { offset: 28, length: 3, replacements: [{ value: 'three!' }], message: 'x' }
    ], text)
    const offsets = merged.map(i => i.offset)
    assert(JSON.stringify(offsets) === JSON.stringify([...offsets].sort((a, b) => a - b)),
        `out of order: ${offsets}`)
})

/* -------------------------------------------------------------- applying -- */

test('applying a suggestion replaces exactly the flagged word', () => {
    const text = 'The syllbus has bad refernces.'
    const [first] = findIssues(text)
    assert(applySuggestion(text, first, 'syllabus') === 'The syllabus has bad refernces.',
        applySuggestion(text, first, 'syllabus'))
})

test('fixing the second problem does not disturb the first', () => {
    // The classic offset bug: fix one word and every later offset moves. The
    // component re-runs the check after each fix rather than reusing stale
    // offsets, and this is the case that would expose it if it did not.
    let text = 'The syllbus has bad refernces.'
    const second = findIssues(text)[1]
    text = applySuggestion(text, second, 'references')
    assert(text === 'The syllbus has bad references.', text)
    const remaining = findIssues(text)
    assert(remaining.length === 1 && remaining[0].word === 'syllbus', JSON.stringify(remaining))
    assert(applySuggestion(text, remaining[0], 'syllabus') === 'The syllabus has bad references.')
})

test('applying an out-of-range issue leaves the text alone', () => {
    const text = 'short'
    assert(applySuggestion(text, { offset: 99, length: 2 }, 'x') === text)
    assert(applySuggestion(text, null, 'x') === text)
    assert(applySuggestion(text, { offset: 0, length: 999 }, 'x') === text)
})

/* --------------------------------------------------------- click target -- */

test('the caret finds the word it is inside, including both edges', () => {
    const text = 'The syllbus has bad refernces.'
    const issues = findIssues(text)
    const first = issues[0]                 // "syllbus" at 4..11
    assert(issueAt(issues, first.offset)?.word === 'syllbus', 'caret before the first letter')
    assert(issueAt(issues, first.offset + 3)?.word === 'syllbus', 'caret inside')
    assert(issueAt(issues, first.offset + first.length)?.word === 'syllbus', 'caret after the last letter')
    assert(issueAt(issues, 0) === null, 'caret in clean text finds nothing')
    assert(issueAt([], 5) === null, 'no issues, no target')
})

console.log(`\n${passed} spell-suggest checks passed.`)
