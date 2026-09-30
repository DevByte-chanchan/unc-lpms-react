import styles from '../styles/Spinner.module.sass'

/**
 * "We are fetching this." A ring, centred in whatever space it is given.
 *
 * It replaces a bare `<div>Loading...</div>`, which had three problems worth
 * naming so they do not come back:
 *   1. It sat wherever it landed — top-left, jammed against the table header —
 *      so it read as a stray word rather than a state.
 *   2. Static text cannot say "still working". A stalled request and a slow
 *      one looked identical; an animation is the difference.
 *   3. It said nothing to a screen reader. `role="status"` plus a real
 *      sentence does.
 *
 *   <Spinner />                      fills its container, centred
 *   <Spinner label="Loading plans" />  says what is being fetched
 *   <Spinner inline size={16} />     no centring box — for inside a button
 *
 * `minHeight` is what makes the centring visible: a flex child with nothing in
 * it has no height to be centred within, so the ring would sit on the top edge
 * and look no better than the text it replaced. It defaults to the viewport
 * minus the page furniture, so "centred" means centred on screen; pass a
 * number for a spinner inside a smaller box (a table cell, a panel).
 */
const Spinner = ({
    size = 28,
    label = 'Loading…',
    inline = false,
    // Viewport-relative, and EXACTLY the value EmptyState uses. A fixed height
    // centres the ring inside a small box near the top of the page, which is
    // what "it is not in the middle" meant — it was centred, just not in the
    // space the reader is looking at. Matching EmptyState matters beyond
    // arithmetic: the spinner is replaced by the empty state the moment loading
    // finishes, and if the two boxes differed the message would visibly jump.
    minHeight = 'calc(100vh - 240px)',
    className = ''
}) => {
    const ring = (
        <span
            className={styles.ring}
            style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size / 10)) }}
        />
    )

    if (inline) {
        return (
            <span className={`${styles.inline} ${className}`} role="status">
                {ring}
                <span className={styles.srOnly}>{label}</span>
            </span>
        )
    }

    return (
        <div className={`${styles.wrap} ${className}`} style={{ minHeight }} role="status" aria-live="polite">
            {ring}
            {/* Visible, because "Loading…" under a spinner is what tells someone
                the page is working rather than broken. */}
            <span className={styles.label}>{label}</span>
        </div>
    )
}

export default Spinner
