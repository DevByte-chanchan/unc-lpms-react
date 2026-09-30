import React from 'react'
import { Check, Clock, RotateCcw, Eye, PenTool } from 'react-feather'
import { consolidatedStatus, verifySignature, canActOnStage } from '../utils/reviewGate.js'
import styles from '../styles/ApprovalChainStatus.module.sass'

/**
 * "consolidated status po sya" [53:22] — one strip showing every stage of the
 * chain, who has approved, who has not, and the Dean's date approved. It reads
 * the stored workflow through `consolidatedStatus`; it decides nothing itself,
 * so the approval screen and the status tracker cannot disagree.
 *
 * Styling lives in `ApprovalChainStatus.module.sass` and comes from the shared
 * tokens in `styles/tokens.css`. It used to be inline values at their own type
 * scale, which is why it looked like a different app from the screen around it.
 *
 * Props:
 * - workflow: the stored workflow object (workflowHelpers.getWorkflow)
 * - compact:  drops the card chrome, for use inside a row that already has some
 * - activeRole:  the signed-in role key (e.g. 'program-head'). When set, that
 *   caller's chip becomes a live control — clickable when the workflow has
 *   reached them — instead of a status-only badge.
 * - onActivate: (roleKey) => void. Called when the active role's chip is
 *   clicked and that role can act; the page wires it to its approve action.
 */
const iconFor = (step) => {
    if (step.readOnly) return <Eye size={14} />
    if (step.status === 'approved') return <Check size={14} strokeWidth={2.5} />
    if (step.status === 'returned') return <RotateCcw size={14} />
    return <Clock size={14} />
}

const shortDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// role keys arrive in several casings (program-head / PROGRAM_HEAD / dean / DEAN)
const normalizeKey = (k) => String(k || '').toLowerCase().replace(/[^a-z]/g, '')

const ApprovalChainStatus = ({ workflow, compact = false, activeRole = null, onActivate = null }) => {
    const status = consolidatedStatus(workflow || {})

    const summary = status.isFullyApproved
        ? `Approved${status.dateApproved ? ` on ${shortDate(status.dateApproved)}` : ''}`
        : `${status.approvedCount}/${status.approvedCount + status.pendingCount} approved — waiting on ${status.awaiting.join(', ')}`

    return (
        <div className={`${styles.strip} ${compact ? styles.compact : ''}`}>
            {!compact && <span className={styles.legend}>Approval status</span>}

            {status.steps.map(step => {
                const signed = step.signature && verifySignature(step.signature)
                const mine = !!activeRole && normalizeKey(step.role) === normalizeKey(activeRole)
                // The chip is a live control only when it is the caller's stage
                // AND the workflow has actually reached them. Others stay badges.
                const actionable = mine && !step.readOnly && !!onActivate &&
                    step.status !== 'approved' && canActOnStage(activeRole, workflow || {})

                const title = [
                    step.readOnly ? 'Read-only access to approved plans' : `${step.label}: ${step.status}`,
                    actionable ? 'Click to approve this stage' : '',
                    step.completedAt ? shortDate(step.completedAt) : '',
                    signed ? `Signed by ${step.signature.name} (${step.signature.signatureId})` : ''
                ].filter(Boolean).join(' · ')

                const className = [
                    styles.step,
                    styles[step.status] || styles.pending,
                    actionable ? styles.actionable : ''
                ].filter(Boolean).join(' ')

                const body = (
                    <>
                        {iconFor(step)}
                        {step.label}
                        {step.final && step.completedAt && <span className={styles.date}>· {shortDate(step.completedAt)}</span>}
                        {signed && <PenTool size={12} />}
                    </>
                )

                // A clickable chip is a real <button>; a status-only chip is not,
                // so a keyboard user is never sent to something inert.
                return actionable ? (
                    <button key={step.role} type="button" className={className} title={title} onClick={() => onActivate(activeRole)}>
                        {body}
                    </button>
                ) : (
                    <span key={step.role} className={className} title={title}>
                        {body}
                    </span>
                )
            })}

            <span className={styles.summary} title={summary}>{summary}</span>
        </div>
    )
}

export default ApprovalChainStatus
