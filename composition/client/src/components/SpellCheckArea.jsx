import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Zap, Check, AlertCircle, X } from 'react-feather'
import { findIssues, mergeIssues, segmentText, applySuggestion, issueAt, isReady, loadWordList } from '../utils/spellSuggest.js'
import { autoCorrect, ATTRIBUTION_URL, ONLINE_SERVICE_CONFIG } from '../utils/autoCorrect.js'
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

    const areaRef = useRef(null)
    const backdropRef = useRef(null)
    const wrapRef = useRef(null)
    const alive = useRef(true)
    useEffect(() => () => { alive.current = false }, [])

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
    useEffect(() => {
        if (!ready) return undefined
        const handle = setTimeout(() => {
            if (alive.current) setLocalIssues(findIssues(value))
        }, 400)
        return () => clearTimeout(handle)
    }, [value, ready])

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
        const res = await autoCorrect(value, { consent: ONLINE_SERVICE_CONFIG.enabled })
        if (!alive.current) return

        let text = value
        if (res.changed && typeof onChange === 'function') {
            text = res.text
            onChange(res.text)
        }
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
        ? 'Check spelling'
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
                                className={seg.issue.source === 'service' ? styles.markGrammar : styles.markSpelling}
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
                    style={{ ...(boxStyle || {}), ...(minHeight ? { minHeight } : {}) }}
                    value={value}
                    rows={rows}
                    placeholder={placeholder}
                    disabled={disabled}
                    spellCheck={nativeSpellCheck}
                    onChange={(e) => typeof onChange === 'function' && onChange(e.target.value)}
                    onScroll={syncScroll}
                    onClick={openAtCaret}
                    onKeyUp={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') openAtCaret() }}
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
                    <span className={`${styles.count} ${styles.clean}`}><Check size={13} /> No spelling problems</span>
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
                            : 'Check spelling with the built-in offline dictionary'}
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
                                {s}
                            </button>
                        ))
                        : <div className={styles.popupEmpty}>No suggestion for this one.</div>}
                </div>
            )}
        </div>
    )
}

export default SpellCheckArea
