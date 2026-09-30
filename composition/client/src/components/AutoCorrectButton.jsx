import React, { useState, useRef, useEffect } from 'react'
import { Check, AlertCircle, Zap } from 'react-feather'
import { autoCorrect, ATTRIBUTION_URL, ONLINE_SERVICE_CONFIG } from '../utils/autoCorrect.js'
import Spinner from './Spinner.jsx'
import styles from '../styles/AutoCorrectButton.module.sass'

/**
 * "Check spelling" for any free-text field in the module — the panel's
 * "may mga API auto spelling grammar check" [49:43].
 *
 * Drop it under a textarea or input:
 *
 *   <AutoCorrectButton value={text} onChange={setText} />
 *
 * Deliberate choices:
 *  - It is a BUTTON, never a check that runs while typing. The free service
 *    allows 20 requests per IP per minute and explicitly asks callers not to
 *    send automated requests; an on-type checker breaks both.
 *  - It never blocks the form. If the service is unreachable it silently uses
 *    the module's built-in word list and says so, so a demo with no internet
 *    still works.
 *  - The attribution link is required by the service's terms — it has to stay
 *    visible, and it must not be rel="nofollow".
 *
 * All the decisions live in `utils/autoCorrect.js`, which is tested under
 * plain node; this component only renders the outcome.
 */
const AutoCorrectButton = ({
    value = '',
    onChange,
    disabled = false,
    label = 'Check spelling',
    compact = false,
    className = ''
}) => {
    const [busy, setBusy] = useState(false)
    const [result, setResult] = useState(null)
    const alive = useRef(true)
    // The text this component itself just wrote back. Without it, the effect
    // below wipes the "Fixed 2 words" message the instant a correction is
    // applied — because applying it is itself a change to `value`.
    const ownEdit = useRef(null)

    useEffect(() => () => { alive.current = false }, [])

    // A new edit invalidates the previous verdict — leaving "Fixed 2 words"
    // under text the user has since rewritten would be a lie. Our own
    // correction is not such an edit.
    useEffect(() => {
        if (ownEdit.current !== null && value === ownEdit.current) return
        ownEdit.current = null
        setResult(null)
    }, [value])

    const run = async () => {
        if (busy || disabled) return
        const consent = !ONLINE_SERVICE_CONFIG.enabled || window.confirm(
            'Online grammar checking sends the full text in this field to the configured LanguageTool service. Continue?'
        )
        if (!consent) return
        setBusy(true)
        setResult(null)
        const res = await autoCorrect(value, { consent: ONLINE_SERVICE_CONFIG.enabled })
        if (!alive.current) return
        if (res.changed && typeof onChange === 'function') {
            ownEdit.current = res.text
            onChange(res.text)
        }
        setResult(res)
        setBusy(false)
    }

    const tone = !result ? '' : result.changed ? styles.good : (result.ok ? styles.neutral : styles.warn)

    return (
        <div className={`${styles.wrap} ${compact ? styles.compact : ''} ${className}`}>
            <div className={styles.row}>
                <button
                    type="button"
                    className={styles.button}
                    onClick={run}
                    disabled={disabled || busy || !String(value || '').trim()}
                    title="Check this text for spelling mistakes"
                >
                    {busy ? <Spinner inline size={14} label="Working…" /> : <Zap size={14} />}
                    {busy ? 'Checking…' : label}
                </button>

                {ONLINE_SERVICE_CONFIG.enabled && (
                    <a className={styles.credit} href={ATTRIBUTION_URL} target="_blank" rel="noopener">
                        powered by LanguageTool
                    </a>
                )}
            </div>

            {result && (
                <p className={`${styles.notice} ${tone}`} role="status">
                    {result.changed
                        ? <Check size={13} />
                        : result.ok ? <Check size={13} /> : <AlertCircle size={13} />}
                    <span>{result.notice}</span>
                </p>
            )}
        </div>
    )
}

export default AutoCorrectButton
