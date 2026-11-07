# Grammar and spelling checker: plan

Status: plan only, nothing built yet. Scope: the approver side (reviewer comments, Director of Libraries
comments, consultant suggestions, Reference Library fields). The instructor's forms are not ours.

## What exists today

| Piece | File | What it does |
|---|---|---|
| Spell-checking text box | `client/src/components/SpellCheckArea.jsx` | Underlines misspelled words as you type; click a word to apply the fix. Used in the comment dialog (2 places) and `pages/CommentRecorder.jsx`. |
| Spelling engine | `client/src/utils/spellSuggest.js` + `utils/wordList.js` (~10,000 words) | Runs in the browser, no network. Flags a word only if it is unknown AND within 2 edits of a known word, so unknown real words are left alone. Tested in `spellSuggest.test.js`. |
| "Check spelling" button | `client/src/components/AutoCorrectButton.jsx` + `utils/autoCorrect.js` | Sends text to LanguageTool (spelling + grammar). **Off by default**: needs `VITE_LPMS_LANGUAGE_TOOL_ENABLED=1` and an HTTPS `VITE_LPMS_LANGUAGE_TOOL_URL`. Without them it falls back to the built-in word list. Used only in `ReferenceFields.jsx`. |

So in practice there is spelling but **no grammar checking**, and the reference fields use a different
checker from the comment boxes.

## Phase 0: what is broken today (found 2026-11-07, fix first)

Tested in the comment dialog with "The studnets need more practise with assesment and authnetcation befor
the exam."

1. **In development it never loads.** The dictionary downloads, but the box stays on "Loading dictionary…"
   forever with no underlines. Cause: `SpellCheckArea.jsx` sets its "still mounted" flag (`alive`) to false
   on unmount and never back to true. React's StrictMode mounts twice in development, so the result is
   thrown away. Fix: set `alive.current = true` inside that effect. The production build is not affected.
2. **"Check spelling" doesn't fix the underlined words.** It only fixes words in the 31-word
   known-misspellings list, so it reports "Fixed 1 word" while "authnetcation" and "befor" stay underlined
   with a fix ready. Fix: the button applies each underlined word's single, unambiguous suggestion too, and
   lists anything it left.
3. **Two counters disagree.** The red "4 problems" under the box (the dictionary checker) and the yellow
   "2 spelling / grammar flags" panel (`checkText` in `reviewGate.js`, the small list) count different
   things. Fix: one checker, one count. The yellow panel uses the same issues as the underlines.
4. **No grammar at all.** "Their is", "teh the" and the like pass. This is Phase 2.

Phase 0 touches `SpellCheckArea.jsx`, `ApprovalCommentBox.jsx` and `reviewGate.js`. `ApprovalCommentBox.jsx`
also has uncommitted changes from another session, so wait until those are committed.

## Decisions to make first

1. **Where grammar comes from**
   - **A. In-browser rules (recommended to start).** We write a small set of rules ourselves. No new
     dependency, works offline, nothing leaves the browser. Catches the common mistakes (list below), not
     deep grammar.
   - **B. Self-hosted LanguageTool in Docker.** Real grammar checking, private, offline. It is a new
     service (Java, roughly 1–2 GB of memory), so it needs your approval as a new dependency.
   - **C. Public LanguageTool API.** Easiest. But reviewer comments leave the server, it allows 20 requests
     per minute, and it requires a visible attribution link.
2. **Language.** English only, or should Filipino/Taglish words not be flagged?
3. **Blocking.** Should spelling or grammar issues block posting a comment, warn before posting, or only
   underline? (Today: only underline.)
4. **Personal dictionary.** Should a reviewer be able to "Add to dictionary" a word (saved per browser)?

## Phases

### Phase 1: Fewer false alarms in spelling
- Build a **course dictionary** from the plan on screen (course title, topics, TLAs, reference titles and
  authors), so terms like "Kubernetes" or "Bayesian" are never flagged in that plan's comments.
- "Ignore" on a flagged word for the rest of that comment.
- Optional (decision 4): "Add to dictionary", kept in `localStorage`.
- Tests: extend `spellSuggest.test.js`.

### Phase 2: In-browser grammar rules (option A)
A new pure module, `utils/grammarRules.js`, with tests, that returns issues in the same shape as
`spellSuggest.findIssues` (start, end, message, suggestion). The first rules:
- a repeated word ("the the")
- "a" / "an" before a vowel or consonant sound ("a ILO" → "an ILO")
- a sentence starting in lowercase, and lowercase "i"
- a missing space after a period or comma, or a space before one
- more than one space in a row
- common confusions: its/it's, their/there, then/than, your/you're (only when the next word makes it
  clear)
- a sentence that doesn't end with punctuation

Each rule stays quiet when unsure, like the spelling rule.

### Phase 3: One checker everywhere
- `SpellCheckArea` shows spelling and grammar together: red underline for spelling, blue for grammar, and
  the same click-to-fix popover.
- A small "2 spelling, 1 grammar" count under the box.
- Replace `AutoCorrectButton` in `ReferenceFields.jsx` with the same checker, so the whole module behaves
  the same way.
- Apply decision 3 (block, warn or underline only) in the comment dialog's submit step.

### Phase 4 (only if option B or C is chosen): Real grammar service
- A server route `POST /api/language/check` that forwards to LanguageTool with a timeout and the rate
  limit, so the address never ships in the client bundle and the browser never calls it directly.
- For option B: add a `languagetool` service to `docker-compose.yml`, internal network only.
- The client asks this route on a "Check grammar" click (not while typing) and merges the results with the
  in-browser ones. If the route fails, it falls back to the in-browser rules.

## Checks before calling it done
- Unit tests for every rule and for the course dictionary.
- In the browser, on the demo copy:
  - Underlines line up with the words in both comment dialogs.
  - Fixes apply in the right place.
  - A 5,000-character comment doesn't lag.
- Lint, client tests, server tests and the build all pass.

## Start here when we pick it up
Answer decisions 1–4. Phases 1–3 need no new dependencies. Phase 4 needs your approval.
