import React from 'react'
import { Inbox } from 'react-feather'
import styles from '../styles/EmptyState.module.sass'

/**
 * What a screen shows when it has nothing to show.
 *
 * A blank region reads as a broken page — the user cannot tell "there is
 * nothing here" from "this failed to load". Every list, table and panel in
 * this module that can legitimately come back empty renders this instead: a
 * centred icon, a plain statement of what is missing, and a hint saying why or
 * what to do next.
 *
 * Props:
 * - title   the one-line statement ("No learning plans pending review")
 * - hint    optional second line explaining why it is empty or what to do
 * - icon    optional react-feather element; defaults to an inbox
 * - action  optional node (a button/link) under the hint
 * - inline  true renders a shorter block for use inside a card or a table cell
 * - colSpan when set, the block is wrapped in <tr><td colSpan=…> so it can be
 *           dropped straight into a <tbody> without breaking the table
 */
const EmptyState = ({ title = 'Nothing here yet', hint = '', icon = null, action = null, inline = false, colSpan = null }) => {
    const block = (
        <div className={`${styles.empty} ${inline ? styles.inline : ''}`}>
            <div className={styles.icon}>{icon || <Inbox size={22} strokeWidth={1.6} />}</div>
            <div className={styles.title}>{title}</div>
            {hint && <div className={styles.hint}>{hint}</div>}
            {action && <div className={styles.action}>{action}</div>}
        </div>
    )

    if (colSpan) {
        return (
            <tr className={styles.row}>
                <td colSpan={colSpan} className={styles.cell}>{block}</td>
            </tr>
        )
    }

    return block
}

export default EmptyState
