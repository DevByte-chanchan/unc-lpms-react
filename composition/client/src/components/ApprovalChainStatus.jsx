import React from 'react'
import { Check, Clock, RotateCcw, Eye, PenTool } from 'react-feather'
import { consolidatedStatus, verifySignature } from '../utils/reviewGate.js'

/**
 * "consolidated status po sya" [53:22] — one strip showing every stage of the
 * chain, who has approved, who has not, and the Dean's date approved. It reads
 * the stored workflow through `consolidatedStatus`; it decides nothing itself,
 * so the approval screen and the status tracker cannot disagree.
 *
 * Props:
 * - workflow: the stored workflow object (workflowHelpers.getWorkflow)
 * - compact:  one line per approver instead of cards (used in tables)
 */
const TONE = {
    approved: { background: '#dcfce7', color: '#047857', border: '#86efac' },
    returned: { background: '#fef3c7', color: '#92400e', border: '#fde68a' },
    pending: { background: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
}

const iconFor = (step) => {
    if (step.readOnly) return <Eye size={13} />
    if (step.status === 'approved') return <Check size={13} />
    if (step.status === 'returned') return <RotateCcw size={13} />
    return <Clock size={13} />
}

const shortDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ApprovalChainStatus = ({ workflow, compact = false }) => {
    const status = consolidatedStatus(workflow || {})

    return (
        <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
            padding: compact ? 0 : '10px 14px',
            background: compact ? 'transparent' : '#fff',
            border: compact ? 'none' : '1px solid #e2e8f0',
            borderRadius: 8, fontFamily: "'Poppins', sans-serif"
        }}>
            {!compact && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Approval status
                </span>
            )}

            {status.steps.map(step => {
                const tone = TONE[step.status] || TONE.pending
                const signed = step.signature && verifySignature(step.signature)
                return (
                    <span
                        key={step.role}
                        title={[
                            step.readOnly ? 'Read-only access to approved plans' : `${step.label}: ${step.status}`,
                            step.completedAt ? shortDate(step.completedAt) : '',
                            signed ? `Signed by ${step.signature.name} (${step.signature.signatureId})` : ''
                        ].filter(Boolean).join(' · ')}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 9px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                            background: tone.background, color: tone.color, border: `1px solid ${tone.border}`
                        }}
                    >
                        {iconFor(step)}
                        {step.label}
                        {step.final && step.completedAt && <span style={{ fontWeight: 500 }}>· {shortDate(step.completedAt)}</span>}
                        {signed && <PenTool size={11} />}
                    </span>
                )
            })}

            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                {status.isFullyApproved
                    ? `Approved${status.dateApproved ? ` on ${shortDate(status.dateApproved)}` : ''}`
                    : `${status.approvedCount}/${status.approvedCount + status.pendingCount} approved — waiting on ${status.awaiting.join(', ')}`}
            </span>
        </div>
    )
}

export default ApprovalChainStatus
