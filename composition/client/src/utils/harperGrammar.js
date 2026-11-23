// Grammar from Harper (harper.js, Apache-2.0, by Automattic): an offline checker that runs in the browser as
// WebAssembly, so no text leaves the computer. It adds the grammar rules our own grammarRules.js does not have
// ("there" for "their", wrong verb forms, and so on).
//
// Only grammar: Harper's spelling is English-only and flags Filipino, Taglish and Naga Bikol words and our
// course codes, so spelling stays with spellSuggest.js and its word lists (Harper's SpellCheck rule is off, and
// any lint of kind "Spelling" is dropped).
//
// The WebAssembly file is large (about 8 MB compressed), so it is fetched only the first time a text box asks,
// then the browser caches it. It runs in a web worker, so typing never waits on it. If it cannot load, the box
// keeps working with the built-in rules.

const SKIP_KINDS = new Set(['Spelling'])
// Rules off: its spelling, and two that lean on its English dictionary and so trip on Filipino and Bikol words
// ("sa" wants "SA", "mga" wants "mg a").
export const OFF = { SpellCheck: false, OrthographicConsistency: false, SplitWords: false }
// isolateEnglish: Harper skips sentences that are unlikely to be English (Filipino, Taglish, Bikol), so its English
// rules do not read them.
export const LINT_OPTIONS = { language: 'plaintext', isolateEnglish: true }
let linterPromise = null

export const loadHarper = () => {
  if (!linterPromise) {
    linterPromise = (async () => {
      const [{ WorkerLinter }, { binary }] = await Promise.all([import('harper.js'), import('harper.js/binary')])
      const linter = new WorkerLinter({ binary })
      await linter.setup()
      const config = await linter.getLintConfig()
      await linter.setLintConfig({ ...config, ...OFF })
      return linter
    })().catch((error) => { linterPromise = null; throw error })
  }
  return linterPromise
}

// Harper's lints in the text box's issue shape ({ offset, length, word, suggestions, message, source }).
// Pure apart from calling the lint objects, so it is tested with a real linter in harperGrammar.test.js.
export const toIssues = (text = '', lints = []) => {
  return lints
    .filter(lint => !SKIP_KINDS.has(lint.lint_kind()))
    .map(lint => {
      // harper.js gives JavaScript (UTF-16) offsets, so they index the string directly, emoji included.
      const { start: offset, end } = lint.span()
      return {
        offset,
        length: end - offset,
        word: text.slice(offset, end),
        suggestions: lint.suggestions().map(s => s.get_replacement_text()),
        message: lint.message(),
        source: 'grammar'
      }
    })
    .filter(issue => issue.length > 0)
}

// Grammar issues for one text, or [] when it is empty or Harper cannot load.
export const harperIssues = async (text = '') => {
  if (!String(text).trim()) return []
  try {
    const linter = await loadHarper()
    return toIssues(text, await linter.lint(text, LINT_OPTIONS))
  } catch (error) {
    if (import.meta.env?.DEV) console.warn('Harper grammar check unavailable:', error?.message || error)
    return []
  }
}

// Harper's issues added to the box's own, where they do not overlap one already there (spelling, or a built-in
// grammar rule that found the same thing). `ignored`: lower-case words the person chose to ignore.
export const withHarper = (issues = [], harper = [], ignored = new Set()) => {
  const overlaps = (h) => issues.some(i => h.offset < i.offset + i.length && i.offset < h.offset + h.length)
  const extra = harper.filter(h => !overlaps(h) && !ignored.has(String(h.word).toLowerCase()))
  return extra.length ? [...issues, ...extra].sort((a, b) => a.offset - b.offset) : issues
}

export default { loadHarper, harperIssues, toIssues, withHarper }
