// Grammar and punctuation checks that run in the browser, next to the spell checker (spellSuggest.js).
//
// Same rule as the spelling side: say something only when sure. Each rule looks for one mistake whose fix is
// certain from the words around it, and returns it in the spell checker's shape
// ({ offset, length, word, suggestions, message, source }), so the text box underlines and fixes both the
// same way. Deep grammar ("the results was") needs a real grammar service; that is not this file.

const issue = (offset, word, suggestion, message) => ({
    offset,
    length: word.length,
    word,
    suggestions: suggestion == null ? [] : [suggestion],
    message,
    source: 'grammar'
})

// Words that take "an" although they start with a consonant letter, and "a" although they start with a vowel.
const AN_EXCEPTIONS = /^(hour|honest|honor|honour|heir|ilo|ict|lms|mba|sql|html|faq|fbi|mri|xml|rsvp)/i
const A_EXCEPTIONS = /^(uni|use|usu|uti|eu|one|once|ubiq|ufo|url|usb|user)/i
const wantsAn = (word) => {
    if (AN_EXCEPTIONS.test(word)) return true
    if (A_EXCEPTIONS.test(word)) return false
    return /^[aeiou]/i.test(word)
}

const RULES = [
    // "the the"
    (text, out) => {
        const re = /\b([A-Za-z]+)(\s+)\1\b/gi
        let m
        while ((m = re.exec(text)) !== null) {
            const repeated = m[2] + m[1]
            out.push(issue(m.index + m[1].length, repeated, '', `“${m[1]}” is repeated.`))
        }
    },
    // "a ILO" / "an topic"
    (text, out) => {
        const re = /\b(a|an|A|An)\s+([A-Za-z][A-Za-z-]*)/g
        let m
        while ((m = re.exec(text)) !== null) {
            const [, article, next] = m
            const right = wantsAn(next) ? 'an' : 'a'
            if (article.toLowerCase() === right) continue
            const fixed = article[0] === 'A' ? right[0].toUpperCase() + right.slice(1) : right
            out.push(issue(m.index, article, fixed, `Use “${fixed}” before “${next}”.`))
        }
    },
    // lowercase "i" as a word
    (text, out) => {
        // ("i.e." is not the pronoun)
        const re = /(^|[^A-Za-z'’.-])(i)(?=$|[^A-Za-z'’.-]|\.(?![A-Za-z]))/g
        let m
        while ((m = re.exec(text)) !== null) {
            out.push(issue(m.index + m[1].length, 'i', 'I', 'The pronoun “I” is capitalised.'))
        }
    },
    // a sentence that starts in lowercase
    (text, out) => {
        const re = /(^\s*|[.!?]\s+)([a-z])/g
        let m
        while ((m = re.exec(text)) !== null) {
            const at = m.index + m[1].length
            // "e.g. the", "i.e. this", "etc. and" and numbers like "3.5" are not sentence ends.
            const before = text.slice(Math.max(0, at - 6), at)
            if (/\b(e\.g|i\.e|etc|vs|cf)\.\s+$/i.test(before)) continue
            if (m[2] === 'i' && /^i(?![A-Za-z])/.test(text.slice(at))) continue // the "I" rule has it
            out.push(issue(at, m[2], m[2].toUpperCase(), 'A sentence starts with a capital letter.'))
        }
    },
    // "word ,next" and "word,next"
    (text, out) => {
        let m
        const spaceBefore = /([A-Za-z])( +)([,.;:!?])(\w?)/g
        while ((m = spaceBefore.exec(text)) !== null) {
            // "labs ,quizzes" becomes "labs, quizzes": the space moves after the mark.
            out.push(issue(m.index + 1, m[2] + m[3], m[4] ? `${m[3]} ` : m[3], `No space before “${m[3]}”.`))
            spaceBefore.lastIndex -= m[4].length
        }
        // A missing space after a comma, or after a sentence's period (not "3.5", "e.g.", "CO1.2" or a web address).
        const noSpaceAfter = /([a-z])([,;])([A-Za-z])|([a-z]{2})(\.)([A-Z][a-z])/g
        while ((m = noSpaceAfter.exec(text)) !== null) {
            const mark = m[2] || m[5]
            const at = m[2] ? m.index + 1 : m.index + 2
            out.push(issue(at, mark, `${mark} `, `Add a space after “${mark}”.`))
        }
    },
    // two or more spaces inside a line
    (text, out) => {
        const re = /(\S)( {2,})(?=\S)/g
        let m
        while ((m = re.exec(text)) !== null) {
            out.push(issue(m.index + 1, m[2], ' ', 'Extra space.'))
        }
    },
    // their is / their are → there; could of → could have; more then → more than
    (text, out) => {
        const pairs = [
            [/\b(their)(?=\s+(is|are|was|were|will be|has been|have been)\b)/gi, 'there', 'Use “there” here.'],
            [/\b(could|should|would|must|might) (of)\b/gi, 'have', 'Use “have” after this word.', 2],
            [/\b(more|less|better|worse|rather|greater|fewer|other|higher|lower) (then)\b/gi, 'than', 'Use “than” in a comparison.', 2],
            [/\b(its)(?= (a|an|the|not|very|important|necessary|recommended|better|best)\b)/gi, 'it’s', 'Use “it’s” (it is) here.']
        ]
        for (const [re, fix, message, group = 1] of pairs) {
            let m
            while ((m = re.exec(text)) !== null) {
                const word = m[group]
                const at = m.index + m[0].indexOf(word, group === 1 ? 0 : m[1].length)
                const fixed = word[0] === word[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix
                out.push(issue(at, word, fixed, message))
            }
        }
    }
]

/** Every grammar issue in `text`, sorted, with no two overlapping. */
export const findGrammarIssues = (text = '') => {
    const source = String(text ?? '')
    if (!source.trim()) return []
    const found = []
    for (const rule of RULES) rule(source, found)
    found.sort((a, b) => a.offset - b.offset || b.length - a.length)
    const kept = []
    let end = -1
    for (const item of found) {
        if (item.offset < end) continue
        kept.push(item)
        end = item.offset + item.length
    }
    return kept
}

export default { findGrammarIssues }
