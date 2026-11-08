import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Zap, Check, AlertCircle, X } from 'react-feather'
import { findIssues, mergeIssues, segmentText, applySuggestion, issueAt, isReady, loadWordList, termWords } from '../utils/spellSuggest.js'
import { autoCorrect, ATTRIBUTION_URL, ONLINE_SERVICE_CONFIG } from '../utils/autoCorrect.js'
import { findGrammarIssues } from '../utils/grammarRules.js'
import Spinner from './Spinner.jsx'
import styles from '../styles/SpellCheckArea.module.sass'

/**
 * A textarea that underlines its own spelling mistakes and lets you click one
 * to fix it.
 *
 *   <SpellCheckArea value={text} onChange={setText} rows={4} />
 *
 * A drop-in replacement for `<textarea>`: same value/onChange/placeholder/rows/
 * disabled, and any extra props pass straight through.
 *
 * HOW THE UNDERLINE IS DRAWN. A <textarea> cannot contain markup, so the marks
 * cannot go in it. Behind the textarea sits a div — the "backdrop" — holding
 * exactly the same text, in exactly the same font, size, padding, border and
 * line-height, with <mark> spans around the flagged words. The textarea is
 * transparent, so the marks show through underneath its real text, and the two
 * scroll together. Every one of those properties has to agree or the underline
 * drifts off the word; that is why they are set once, together, in
 * SpellCheckArea.module.sass, and why the browser check measures a mark
 * against the caret rather than trusting the CSS.
 *
 * WHY NOT THE BROWSER'S OWN CHECKER. It draws the same red line and offers the
 * same menu on right-click, but it will not tell JavaScript what it found —
 * there is no API for its suggestions. So the page cannot count the mistakes,
 * cannot block submission on them, cannot apply a fix itself, and cannot show
 * anything the reviewer's own dictionary knows about ("assesment" →
 * "assessment"). This one is ours, so it can do all four.
 *
 * `spellCheck={false}` on the textarea is therefore deliberate: two sets of red
 * squiggles on the same word looks broken. Pass `nativeSpellCheck` to keep the
 * browser's as well.
 */
// Spelling (when the dictionary is loaded) and grammar, in text order. Where both mark the same characters the
// spelling one wins: a misspelt word is the first thing to fix.
// Words someone chose to "Ignore" this session, in any box (not kept after a reload).
const IGNORED = new Set()

const localCheck = (text, skip = new Set(), checkCapitals = false) => {
    const spelling = findIssues(text, { checkCapitals }).filter(i => {
        const word = i.word.toLowerCase()
        return !skip.has(word) && !IGNORED.has(word)
    })
    const taken = (g) => spelling.some(s => g.offset < s.offset + s.length && s.offset < g.offset + g.length)
    return [...spelling, ...findGrammarIssues(text).filter(g => !taken(g))].sort((a, b) => a.offset - b.offset)
}

// A fix that removes text or only changes spaces has nothing to show as its label.
const suggestionLabel = (s) => (s.trim() ? s : s === '' ? 'Remove' : 'One space')

const SpellCheckArea = ({
    value = '',
    onChange,
    disabled = false,
    className = '',
    rows = 4,
    placeholder = '',
    nativeSpellCheck = false,
    // Padding has to be identical on the textarea and on the backdrop behind
    // it, or the underline slides off the word. So it is one prop applied to
    // both, never a className on one of them — passing a caller's textarea
    // class straight through is exactly how that alignment gets broken.
    padding = null,
    minHeight = null,
    // Off by default: the free service allows 20 requests per IP per minute
    // and asks callers not to automate them, so grammar goes behind a button.
    showButton = true,
    label = 'Check grammar',
    // Names the text is about (a plan's topics, TLAs, references): their words are never flagged as misspelled.
    knownWords = [],
    // A one-line field (a title): no resize handle, and Enter does not start a new line.
    singleLine = false,
    // Also check capitalised words (a title, where every word is capitalised); prose skips them as names.
    checkCapitals = false,
    ...rest
}) => {
    const [serviceMatches, setServiceMatches] = useState([])
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState(null)
    const [open, setOpen] = useState(null)          // { issue, top, left }
    const [localIssues, setLocalIssues] = useState([])
    // The ~33,000-word dictionary is a separate chunk, fetched the first time
    // one of these is mounted. Until it lands there is no checker, and the bar
    // must not claim a clean bill of health it has not earned.
    const [ready, setReady] = useState(isReady())
    const knownKey = (Array.isArray(knownWords) ? knownWords : []).join('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const skip = useMemo(() => termWords(knownWords), [knownKey])

    const areaRef = useRef(null)
    const backdropRef = useRef(null)
    const wrapRef = useRef(null)
    const alive = useRef(true)
    // Set on mount, not only at creation: React mounts twice in development, and a flag left false by the
    // first unmount used to throw the loaded dictionary away (the box stayed on "Loading dictionary…").
    useEffect(() => { alive.current = true; return () => { alive.current = false } }, [])

    useEffect(() => {
        if (ready) return
        let live = true
        loadWordList().then(ok => { if (live && alive.current) setReady(ok) })
        return () => { live = false }
    }, [ready])

    // The spell pass is cheap but not free (~10ms for a word it has never seen,
    // then cached), so it runs a beat after typing stops rather than on every
    // keystroke. 400ms is below the pause between words for most typists, so
    // the underline appears to keep up without ever running mid-word.
    // `ready` is in the dependencies so the first pass runs the moment the
    // dictionary arrives, without waiting for another keystroke.
    // Grammar needs no dictionary, so it runs even before the word list has arrived.
    useEffect(() => {
        const handle = setTimeout(() => {
            if (alive.current) setLocalIssues(localCheck(value, skip, checkCapitals))
        }, 400)
        return () => clearTimeout(handle)
    }, [value, ready, skip, checkCapitals])

    // The service's findings are about the text it was given. The moment the
    // text changes they are about nothing, and their offsets point at the
    // wrong words — so they go, rather than underlining whatever has since
    // been typed in that position.
    const checkedText = useRef('')
    useEffect(() => {
        if (checkedText.current !== value) {
            checkedText.current = ''
            setServiceMatches([])
            setNotice(null)
        }
        setOpen(null)
    }, [value])

    const issues = useMemo(
        () => mergeIssues(localIssues, serviceMatches, value),
        [localIssues, serviceMatches, value]
    )

    const segments = useMemo(() => segmentText(value, issues), [value, issues])

    const syncScroll = useCallback(() => {
        if (!backdropRef.current || !areaRef.current) return
        backdropRef.current.scrollTop = areaRef.current.scrollTop
        backdropRef.current.scrollLeft = areaRef.current.scrollLeft
    }, [])

    // Which word did they click? The textarea already knows — after a click
    // `selectionStart` is the caret, which is inside the word that was hit.
    // Working it out from the click coordinates instead would mean measuring
    // text, and would disagree with the caret at every line wrap.
    const openAtCaret = useCallback(() => {
        const area = areaRef.current
        if (!area) return
        const issue = issueAt(issues, area.selectionStart)
        if (!issue) { setOpen(null); return }

        // Anchor to the <mark> itself, so the popup follows the word through
        // wrapping and scrolling instead of guessing at a position.
        const mark = backdropRef.current?.querySelector(`[data-issue="${issue.offset}"]`)
        const wrap = wrapRef.current
        if (!mark || !wrap) { setOpen({ issue, top: 0, left: 0 }); return }
        const m = mark.getBoundingClientRect()
        const w = wrap.getBoundingClientRect()
        setOpen({ issue, top: m.bottom - w.top + 2, left: Math.max(0, m.left - w.left) })
    }, [issues])

    // Click anywhere else, or press Escape, and the popup goes away — the two
    // things every menu is expected to do.
    useEffect(() => {
        if (!open) return
        const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(null) }
        const onKey = (e) => { if (e.key === 'Escape') { setOpen(null); areaRef.current?.focus() } }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    // Leave this word alone, here and in every other box, until the page is reloaded.
    const ignore = (issue) => {
        IGNORED.add(issue.word.toLowerCase())
        setOpen(null)
        setLocalIssues(localCheck(value, skip, checkCapitals))
        areaRef.current?.focus()
    }

    const apply = (issue, replacement) => {
        const next = applySuggestion(value, issue, replacement)
        setOpen(null)
        if (typeof onChange === 'function') onChange(next)
        // Put the caret after the word they just fixed, so typing continues
        // where they were rather than jumping to the end of the box.
        requestAnimationFrame(() => {
            const area = areaRef.current
            if (!area) return
            const at = issue.offset + replacement.length
            area.focus()
            area.setSelectionRange(at, at)
        })
    }

    const runService = async () => {
        if (busy || disabled) return
        const consent = !ONLINE_SERVICE_CONFIG.enabled || window.confirm(
            'Online grammar checking sends the full text in this field to the configured LanguageTool service. Continue?'
        )
        if (!consent) return
        setBusy(true)
        setNotice(null)
        // First every underlined problem whose fix is certain (exactly one suggestion), right to left so the
        // offsets still hold. The rest stay underlined for the reviewer to pick from.
        const found = localCheck(value, skip, checkCapitals)
        const sure = found.filter(i => i.suggestions.length === 1).sort((a, b) => b.offset - a.offset)
        const fixedLocally = sure.reduce((t, i) => applySuggestion(t, i, i.suggestions[0]), value)
        const left = found.length - sure.length

        if (!ONLINE_SERVICE_CONFIG.enabled) {
            // Marked as checked, so the text change below does not clear the message it is about.
            checkedText.current = fixedLocally
            if (sure.length && typeof onChange === 'function') onChange(fixedLocally)
            const fixedWords = sure.slice().reverse().map(i => `“${i.word.trim() || i.word}” → “${suggestionLabel(i.suggestions[0])}”`)
            setNotice({
                notice: [
                    sure.length ? `Fixed ${sure.length}: ${fixedWords.slice(0, 5).join(', ')}${sure.length > 5 ? ', …' : ''}.` : 'Nothing to fix automatically.',
                    left ? `${left} left to choose: click the underlined ${left === 1 ? 'word' : 'words'}.` : ''
                ].filter(Boolean).join(' ')
            })
            setBusy(false)
            return
        }

        const res = await autoCorrect(fixedLocally, { consent: ONLINE_SERVICE_CONFIG.enabled })
        if (!alive.current) return

        let text = fixedLocally
        if (res.changed) text = res.text
        if (text !== value && typeof onChange === 'function') onChange(text)
        // Only keep matches that still line up with the text we now hold —
        // auto-applying some of them moved everything after the first edit.
        checkedText.current = text
        setServiceMatches(res.changed ? [] : (res.matches || []))
        setNotice(res)
        setBusy(false)
    }

    const count = issues.length
    const hasText = !!String(value || '').trim()
    const boxStyle = padding ? { padding } : undefined
    const buttonLabel = !ONLINE_SERVICE_CONFIG.enabled && label === 'Check grammar'
        ? 'Fix spelling & grammar'
        : label

    return (
        <div className={styles.wrap} ref={wrapRef}>
            <div className={styles.field}>
                <div className={styles.backdrop} ref={backdropRef} aria-hidden="true" style={boxStyle}>
                    {segments.map((seg, i) => seg.issue
                        ? (
                            <mark
                                key={i}
                                data-issue={seg.issue.offset}
                                className={seg.issue.source === 'local' ? styles.markSpelling : styles.markGrammar}
                            >
                                {seg.text}
                            </mark>
                        )
                        : <span key={i}>{seg.text}</span>
                    )}
                    {/* A trailing newline is not rendered by a div the way it
                        is by a textarea; without this the last line scrolls
                        out of step. */}
                    {'\n'}
                </div>

                <textarea
                    {...rest}
                    ref={areaRef}
                    className={`${styles.area} ${className}`}
                    style={{ ...(boxStyle || {}), ...(minHeight ? { minHeight } : {}), ...(singleLine ? { resize: 'none' } : {}) }}
                    value={value}
                    rows={rows}
                    placeholder={placeholder}
                    disabled={disabled}
                    spellCheck={nativeSpellCheck}
                    onChange={(e) => typeof onChange === 'function' && onChange(e.target.value)}
                    onScroll={syncScroll}
                    onClick={openAtCaret}
                    onKeyUp={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') openAtCaret() }}
                    onKeyDown={singleLine ? (e) => { if (e.key === 'Enter') e.preventDefault() } : undefined}
                />
            </div>

            <div className={styles.bar}>
                {count > 0 && (
                    <button
                        type="button"
                        className={styles.count}
                        onClick={() => {
                            const first = issues[0]
                            const area = areaRef.current
                            if (!area) return
                            area.focus()
                            area.setSelectionRange(first.offset, first.offset + first.length)
                            // Same anchoring as a click; this is the keyboard
                            // route to the popup, so it is reachable without a
                            // mouse.
                            setTimeout(openAtCaret, 0)
                        }}
                        title="Go to the first problem"
                    >
                        <AlertCircle size={13} />
                        {count} {count === 1 ? 'problem' : 'problems'}
                    </button>
                )}
                {count === 0 && hasText && ready && (
                    <span className={`${styles.count} ${styles.clean}`}><Check size={13} /> No spelling or grammar problems</span>
                )}
                {/* Said plainly rather than passed off as "no problems". If the
                    chunk never arrives this is what stays on screen, which is
                    the difference between a bug you can see and one you
                    cannot. */}
                {!ready && hasText && (
                    <span className={`${styles.count} ${styles.pending}`}>
                        <Spinner inline size={13} label="Working…" /> Loading dictionary…
                    </span>
                )}

                {showButton && (
                    <button
                        type="button"
                        className={styles.check}
                        onClick={runService}
                        disabled={disabled || busy || !hasText}
                        title={ONLINE_SERVICE_CONFIG.enabled
                            ? 'Check grammar online (the full text is sent only after confirmation)'
                            : 'Fix every underlined problem that has only one possible fix'}
                    >
                        {busy ? <Spinner inline size={13} label="Working…" /> : <Zap size={13} />}
                        {busy ? 'Checking…' : buttonLabel}
                    </button>
                )}

                {ONLINE_SERVICE_CONFIG.enabled && (
                    <a className={styles.credit} href={ATTRIBUTION_URL} target="_blank" rel="noopener">
                        powered by LanguageTool
                    </a>
                )}
            </div>

            {notice && (
                <p className={styles.notice} role="status">{notice.notice}</p>
            )}

            {open && (
                <div className={styles.popup} style={{ top: open.top, left: open.left }} role="dialog" aria-label="Spelling suggestions">
                    <div className={styles.popupHead}>
                        <span>{open.issue.message}</span>
                        <button type="button" className={`${styles.popupClose} app-icon-close`} onClick={() => setOpen(null)} aria-label="Close spelling suggestions">
                            <X size={12} />
                        </button>
                    </div>
                    {open.issue.suggestions.length > 0
                        ? open.issue.suggestions.map(s => (
                            <button key={s} type="button" className={styles.suggestion} onClick={() => apply(open.issue, s)}>
                                {suggestionLabel(s)}
                            </button>
                        ))
                        : <div className={styles.popupEmpty}>No suggestion for this one.</div>}
                    {open.issue.source === 'local' && (
                        <button type="button" className={`${styles.suggestion} ${styles.ignore}`} onClick={() => ignore(open.issue)}>
                            Ignore
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default SpellCheckArea
