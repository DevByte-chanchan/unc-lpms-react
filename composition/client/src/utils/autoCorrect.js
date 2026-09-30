// Spelling and grammar correction for the module's free-text fields.
//
// "may mga API auto spelling grammar check" [49:43] — the panel asked for a
// real checker rather than a hand-kept word list. `reviewGate.checkText` is
// that word list; it is deliberately small and misses ordinary typos (it finds
// nothing at all in "This syllbus has bad refernces"). This module adds the
// online service on top, and falls back to the word list when the service is
// not reachable.
//
// SHAPE OF THIS FILE — this matters more than it looks:
//   * The pure half (`applyCorrections`, `isProtectedToken`, `shouldApply`,
//     `localMatches`, the rate limiter) has no network and no React, so
//     `autoCorrect.test.js` drives all of it under plain node. The offset
//     splicing is where this kind of feature actually breaks, so it is the
//     part that must be testable.
//   * The I/O half is one thin function, `fetchMatches`.
// Keep that split. A single function that both fetches and edits text cannot
// be tested and will rot.
//
// SERVICE LIMITS (api.languagetool.org, free tier, checked 2026-08-12):
//   20 requests per IP per minute · 75KB text per IP per minute ·
//   20KB per request · POST only · "do not send automated requests" ·
//   no availability guarantee · a visible, non-nofollow link back to
//   languagetool.org is required of anyone using it.
// Those limits are why this is a button the user presses, never a check that
// runs as they type: on-type checking is both "automated requests" and a
// certain way to blow 20/minute during a demo.

import { MISSPELLINGS } from './reviewGate.js'

export const ATTRIBUTION_URL = 'https://languagetool.org'

const buildEnvironment = import.meta.env || {}

export const getOnlineServiceConfig = (override) => {
    const candidate = override || {
        enabled: buildEnvironment.VITE_LPMS_LANGUAGE_TOOL_ENABLED === '1',
        endpoint: buildEnvironment.VITE_LPMS_LANGUAGE_TOOL_URL || ''
    }
    if (!candidate.enabled) return { enabled: false, endpoint: '' }
    try {
        const endpoint = new URL(String(candidate.endpoint || ''))
        if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) {
            return { enabled: false, endpoint: '' }
        }
        return { enabled: true, endpoint: endpoint.toString() }
    } catch {
        return { enabled: false, endpoint: '' }
    }
}

// Default-off. Enabling online grammar requires both an explicit build flag
// and an explicit HTTPS endpoint; otherwise all checks stay in the browser.
export const ONLINE_SERVICE_CONFIG = Object.freeze(getOnlineServiceConfig())
export const API_URL = ONLINE_SERVICE_CONFIG.endpoint

export const LIMITS = {
    // One under the documented 20, so a stray retry cannot tip us over.
    requestsPerMinute: 19,
    // The service caps a request at 20KB; stop well short and tell the user
    // rather than sending something that will be rejected.
    maxChars: 8000,
    // Below this there is nothing worth a network round trip.
    minChars: 3
}

// HOW LONG TO WAIT BEFORE GIVING UP.
//
// `fetch` has no timeout. Without this the button sat on "Checking…"
// indefinitely whenever the service was slow, blocked by a network, or simply
// not answering — no error, no result, no way out except reloading the page.
// A spell checker is not worth six seconds of a reviewer's attention, and the
// offline dictionary is right there, so we cut it off and fall back.
export const TIMEOUT_MS = 6000

// ------------------------------------------------------------- guards ---

// Things that look misspelled to a general-purpose checker but are correct
// here. A syllabus is full of them, and silently rewriting "CO2-ILO2" into
// "CO2-ILO" would corrupt the very thing the approver is commenting on.
export const PROTECTED_PATTERNS = [
    /^[A-Z]{2,}\s?\d{2,}[A-Z]?$/,      // BIT321L, BSCS 511, IT 402
    /^[A-Z]{2,}\d*-[A-Z]{2,}\d*$/i,    // CO2-ILO2, PO1-PEO3
    /^(CO|ILO|PO|PEO|TLA|TOS|OER|CMO|CHED|LPMS|VPAA|UNC|ISBN|API|AI)\d*$/i,
    /^\d+(\.\d+)?%?$/,                 // bare numbers and percentages
    /^[A-Z]{3,}$/                      // any all-caps acronym
]

export const isProtectedToken = (token = '') => {
    const t = String(token).trim()
    if (!t) return false
    return PROTECTED_PATTERNS.some(re => re.test(t))
}

// Only these get applied without asking. Everything else the service reports
// is still shown to the user, but it is not rewritten for them: a grammar
// "fix" that changes the meaning of a reviewer's instruction is worse than the
// typo it replaces.
export const AUTO_APPLY_CATEGORIES = new Set(['TYPOS', 'TYPOGRAPHY', 'CASING'])

/**
 * Whether a single match may be applied silently.
 * Rejects: no replacement offered, a protected token, a non-spelling category,
 * and a "correction" that only changes surrounding whitespace.
 */
export const shouldApply = (match, text = '') => {
    if (!match || typeof match.offset !== 'number' || typeof match.length !== 'number') return false
    if (match.offset < 0 || match.length <= 0 || match.offset + match.length > text.length) return false

    const replacement = match.replacements?.[0]?.value
    if (!replacement) return false

    const original = text.slice(match.offset, match.offset + match.length)
    if (original === replacement) return false
    if (isProtectedToken(original)) return false
    if (isProtectedToken(replacement)) return false

    const category = match.rule?.category?.id || match.rule?.issueType || ''
    const isSpelling = match.rule?.issueType === 'misspelling' || AUTO_APPLY_CATEGORIES.has(category)
    return !!isSpelling
}

// ------------------------------------------------------ the pure splice ---

/**
 * Apply matches to `text`, back to front.
 *
 * Back to front is not a style choice: every offset the service returns is an
 * index into the ORIGINAL string, so editing left to right shifts every offset
 * after the first edit and the second replacement lands in the wrong place.
 * Sorting descending means each splice only touches text after the offsets
 * still to be used.
 *
 * Overlapping matches are dropped rather than merged — applying both would
 * corrupt the overlap, and the service does occasionally return two rules for
 * the same span.
 *
 * @returns {{text: string, applied: Array, skipped: Array}}
 */
export const applyCorrections = (text = '', matches = []) => {
    const source = String(text ?? '')
    const usable = (Array.isArray(matches) ? matches : []).filter(m => shouldApply(m, source))
    const skipped = (Array.isArray(matches) ? matches : []).filter(m => !shouldApply(m, source))

    const ordered = [...usable].sort((a, b) => b.offset - a.offset)

    let out = source
    const applied = []
    let lastStart = Infinity

    ordered.forEach(m => {
        const end = m.offset + m.length
        // Descending order means anything reaching past the previous match's
        // start overlaps it.
        if (end > lastStart) { skipped.push(m); return }
        const from = source.slice(m.offset, end)
        const to = m.replacements[0].value
        out = out.slice(0, m.offset) + to + out.slice(end)
        applied.push({ from, to, offset: m.offset })
        lastStart = m.offset
    })

    // Report in reading order, not the order they were spliced.
    applied.reverse()
    return { text: out, applied, skipped }
}

export const summarize = (applied = []) => {
    if (!applied.length) return 'No spelling problems found.'
    const shown = applied.slice(0, 3).map(a => `“${a.from}” → “${a.to}”`).join(', ')
    const more = applied.length > 3 ? `, +${applied.length - 3} more` : ''
    return `Fixed ${applied.length} ${applied.length === 1 ? 'word' : 'words'}: ${shown}${more}.`
}

// ------------------------------------------------- offline fallback ---

// The same dictionary `reviewGate.checkText` uses, turned into matches that
// carry offsets so they can go through exactly the same splice as the online
// ones. Whole words only, so "reference" is not mangled via "refrence".
export const localMatches = (text = '') => {
    const source = String(text ?? '')
    const out = []
    const re = /[A-Za-z']+/g
    let m
    while ((m = re.exec(source)) !== null) {
        const word = m[0]
        const fix = MISSPELLINGS[word.toLowerCase()]
        if (!fix) continue
        // Keep the writer's capitalisation.
        const replacement = /^[A-Z]/.test(word) ? fix[0].toUpperCase() + fix.slice(1) : fix
        out.push({
            offset: m.index,
            length: word.length,
            replacements: [{ value: replacement }],
            rule: { issueType: 'misspelling', category: { id: 'TYPOS' } },
            message: `“${word}” looks misspelled.`
        })
    }
    return out
}

// ------------------------------------------------------ rate limiting ---

// A plain sliding window. Exported with an injectable clock so the test can
// drive it without waiting a real minute.
export const createRateLimiter = (max = LIMITS.requestsPerMinute, windowMs = 60000) => {
    let stamps = []
    return {
        tryTake(now = Date.now()) {
            stamps = stamps.filter(t => now - t < windowMs)
            if (stamps.length >= max) return false
            stamps.push(now)
            return true
        },
        remaining(now = Date.now()) {
            stamps = stamps.filter(t => now - t < windowMs)
            return Math.max(0, max - stamps.length)
        },
        reset() { stamps = [] }
    }
}

const limiter = createRateLimiter()

// ------------------------------------------------------------- the I/O ---

/**
 * The only function here that touches the network. POST form-encoded, as the
 * service requires.
 */
export const fetchMatches = async (text, { endpoint, consent = false, language = 'en-US', signal, fetchImpl, timeoutMs = TIMEOUT_MS } = {}) => {
    if (consent !== true) throw new Error('explicit consent is required before sending text online')
    const doFetch = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null)
    if (!doFetch) throw new Error('no fetch available')
    const service = getOnlineServiceConfig({ enabled: true, endpoint })
    if (!service.enabled) throw new Error('online grammar endpoint is not configured')

    const body = new URLSearchParams()
    body.set('text', text)
    body.set('language', language)

    // The caller's signal still works; this adds our own deadline on top, and
    // aborts for real rather than just resolving early — a request left
    // running after we stopped caring still counts against the rate limit.
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const timer = controller && timeoutMs > 0
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null
    if (signal && controller) {
        if (signal.aborted) controller.abort()
        else signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
        const res = await doFetch(service.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            signal: controller ? controller.signal : signal
        })
        if (!res.ok) throw new Error(`LanguageTool returned ${res.status}`)
        const data = await res.json()
        return Array.isArray(data?.matches) ? data.matches : []
    } catch (e) {
        // AbortError is our deadline nine times out of ten; say so in words the
        // notice can show, instead of "signal is aborted without reason".
        if (e?.name === 'AbortError') throw new Error(`no answer in ${Math.round(timeoutMs / 1000)}s`)
        throw e
    } finally {
        if (timer) clearTimeout(timer)
    }
}

/**
 * Correct a piece of text. Never throws — the caller gets a result object
 * either way, because a spell checker that breaks the form it is attached to
 * is worse than no spell checker.
 *
 * `source` says where the corrections came from, so the UI can be honest:
 *   'online'    the service answered
 *   'offline'   the service was unreachable or rate-limited; the built-in
 *               dictionary was used instead
 *   'skipped'   nothing to check
 *
 * @returns {{ok, text, changed, applied, skipped, source, notice}}
 */
export const autoCorrect = async (text, opts = {}) => {
    const source = String(text ?? '')
    const trimmed = source.trim()

    if (trimmed.length < LIMITS.minChars) {
        return { ok: true, text: source, changed: false, applied: [], skipped: [], source: 'skipped', notice: 'Nothing to check yet.' }
    }
    if (source.length > LIMITS.maxChars) {
        return { ok: false, text: source, changed: false, applied: [], skipped: [], source: 'skipped', notice: `Text is too long to check (limit ${LIMITS.maxChars} characters).` }
    }

    const fallbackToLocal = (why) => {
        const result = applyCorrections(source, localMatches(source))
        return {
            ok: true,
            text: result.text,
            changed: result.text !== source,
            applied: result.applied,
            skipped: result.skipped,
            matches: [],
            source: 'offline',
            notice: `${summarize(result.applied)} (${why} — checked against the built-in list only.)`
        }
    }

    const onlineService = getOnlineServiceConfig(opts.onlineService || ONLINE_SERVICE_CONFIG)
    if (!onlineService.enabled) {
        return fallbackToLocal('online grammar checking is disabled')
    }
    if (opts.consent !== true) {
        return fallbackToLocal('the online grammar check was not confirmed')
    }

    if (!(opts.limiter || limiter).tryTake(opts.now)) {
        return fallbackToLocal('online checks are rate-limited for a moment')
    }

    try {
        const matches = await fetchMatches(source, { ...opts, endpoint: onlineService.endpoint })
        const result = applyCorrections(source, matches)
        return {
            ok: true,
            text: result.text,
            changed: result.text !== source,
            applied: result.applied,
            skipped: result.skipped,
            // The raw matches, so the caller can turn everything we did NOT
            // auto-apply into something the user can click. Without this the
            // grammar findings were computed and then thrown away.
            matches,
            source: 'online',
            notice: summarize(result.applied)
        }
    } catch (e) {
        return fallbackToLocal(`the online checker could not be reached${e?.message ? `: ${e.message}` : ''}`)
    }
}

export default {
    API_URL,
    ATTRIBUTION_URL,
    ONLINE_SERVICE_CONFIG,
    getOnlineServiceConfig,
    LIMITS,
    TIMEOUT_MS,
    PROTECTED_PATTERNS,
    isProtectedToken,
    AUTO_APPLY_CATEGORIES,
    shouldApply,
    applyCorrections,
    summarize,
    localMatches,
    createRateLimiter,
    fetchMatches,
    autoCorrect
}
