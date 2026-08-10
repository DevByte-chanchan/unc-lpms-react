// Review-side rules: what an approver must supply before an item can be
// returned, what kinds of comment they can leave, what a signed approval looks
// like, and how the whole chain reads as one consolidated status.
//
// Pure, so `reviewGate.test.js` drives it under plain node. The approval screen
// is the only caller.

import { normalizeRoleKey, ROLE_LABEL_MAP } from './approvalHelpers.js'

// ------------------------------------------------------ return-to-sender ---

// "may disapproval... ibabalik sa sender" [1:23:33] — "kailangan po muna kasi
// ng sample comment" [1:23:40]. Suggested references alone are not a reason.
export const validateReturn = (payload = {}) => {
    const texts = (payload.comments || [])
        .map(c => String(c?.text ?? c?.comment ?? '').trim())
        .filter(Boolean)

    if (texts.length === 0) {
        return { ok: false, error: 'Add a comment saying what has to change — an item cannot be returned without one.' }
    }
    if (texts.every(t => t.length < 5)) {
        return { ok: false, error: 'The comment is too short to act on. Say what the instructor needs to change.' }
    }
    return { ok: true }
}

// ------------------------------------------------------- comment types ---

// "pwede syang mag-suggest ng TLA... ng topic... ng AI tools" [48:30]. The
// instructor sees these as distinct, actionable suggestions rather than one
// undifferentiated blob of free text.
export const COMMENT_TYPES = [
    { key: 'revision', label: 'Requested revision', hint: 'What has to change before this can be approved.', actionable: true },
    { key: 'suggest-topic', label: 'Suggested topic', hint: 'A topic to add or replace.', actionable: true },
    { key: 'suggest-tla', label: 'Suggested TLA', hint: 'A teaching / learning activity to use.', actionable: true },
    { key: 'suggest-ai-tool', label: 'Suggested AI tool', hint: 'An AI tool the students could use here.', actionable: true },
    { key: 'note', label: 'Note', hint: 'Context only — nothing to act on.', actionable: false }
]

export const commentTypeMeta = (key) => COMMENT_TYPES.find(t => t.key === key) || COMMENT_TYPES[0]

export const isActionableComment = (comment) => commentTypeMeta(comment?.commentType).actionable

// The server stores a comment as one `message` string, so the type travels with
// it as a leading tag. That keeps /api/comments/by-course unchanged while the
// instructor still sees "Suggested TLA" rather than one undifferentiated blob.
export const encodeCommentType = (commentType, text = '') => {
    const meta = commentTypeMeta(commentType)
    const body = String(text || '').trim()
    if (!body) return ''
    return `[${meta.label}] ${body}`
}

export const parseCommentType = (message = '') => {
    const raw = String(message || '')
    const match = /^\s*\[([^\]]+)\]\s*/.exec(raw)
    const meta = match && COMMENT_TYPES.find(t => t.label.toLowerCase() === match[1].trim().toLowerCase())
    if (!meta) return { commentType: null, label: '', actionable: true, text: raw }
    return {
        commentType: meta.key,
        label: meta.label,
        actionable: meta.actionable,
        text: raw.slice(match[0].length)
    }
}

// ---------------------------------------------------- spelling / grammar ---

// Runs offline at entry so a typo never reaches the program head [46:58]
// [49:25]. A hosted grammar API would catch more — that needs a key and a
// human decision, so it is deliberately not called from here [49:43].
const MISSPELLINGS = {
    teh: 'the', adn: 'and', recieve: 'receive', seperate: 'separate', occured: 'occurred',
    definately: 'definitely', accomodate: 'accommodate', neccessary: 'necessary',
    refrence: 'reference', refrences: 'references', sylabus: 'syllabus', sylabbus: 'syllabus',
    curriculam: 'curriculum', assesment: 'assessment', assesments: 'assessments',
    acheive: 'achieve', begining: 'beginning', consistant: 'consistent', enviroment: 'environment',
    knowlege: 'knowledge', learnig: 'learning', outcomess: 'outcomes', priciples: 'principles',
    studnets: 'students', succesful: 'successful', therefor: 'therefore', untill: 'until',
    whcih: 'which', wich: 'which', writting: 'writing', calander: 'calendar'
}

export const checkText = (text = '') => {
    const value = String(text || '')
    const issues = []
    if (!value.trim()) return issues

    const push = (kind, message, suggestion = '') => issues.push({ kind, message, suggestion })

    // Spelling against the local list.
    const words = value.match(/[A-Za-z']+/g) || []
    const seen = new Set()
    words.forEach(w => {
        const lower = w.toLowerCase()
        if (MISSPELLINGS[lower] && !seen.has(lower)) {
            seen.add(lower)
            push('spelling', `“${w}” looks misspelled.`, MISSPELLINGS[lower])
        }
    })

    // Grammar / mechanics.
    const repeated = /\b(\w+)\s+\1\b/i.exec(value)
    if (repeated) push('grammar', `“${repeated[1]} ${repeated[1]}” repeats a word.`, repeated[1])

    if (/\bi\b/.test(value)) push('grammar', 'The pronoun “i” should be capitalised.', 'I')

    const firstLetter = value.trim()[0]
    if (firstLetter && /[a-z]/.test(firstLetter)) {
        push('grammar', 'The comment does not start with a capital letter.', firstLetter.toUpperCase())
    }

    if (/[a-z],[A-Za-z]/.test(value) || /[a-z]\.[A-Za-z]{2}/.test(value)) {
        push('grammar', 'Punctuation is missing a space after it.')
    }

    if (/ {2,}/.test(value)) push('grammar', 'There is a double space.')

    return issues
}

export const hasBlockingTextIssues = (text) => checkText(text).some(i => i.kind === 'spelling')

// --------------------------------------------------------- signature ---

// "pwede ba naka-attach na digital signature?" [53:41]. A demo-grade signature:
// who signed, in what role, when, plus a digest so an edited record is visible.
const digest = (value = '') => {
    let hash = 5381
    for (let i = 0; i < value.length; i++) hash = ((hash * 33) ^ value.charCodeAt(i)) >>> 0
    return hash.toString(36).toUpperCase()
}

export const buildSignature = (user, roleKey, courseCode, when = new Date()) => {
    if (!user?.name) return null
    const signedAt = when instanceof Date ? when.toISOString() : String(when)
    const role = normalizeRoleKey(roleKey || user.role)
    return {
        name: user.name,
        role,
        roleLabel: ROLE_LABEL_MAP[role] || user.roleLabel || role,
        signedAt,
        courseCode: courseCode || '',
        signatureId: `SIG-${digest(`${user.name}|${role}|${courseCode}|${signedAt}`)}`
    }
}

export const verifySignature = (signature) => {
    if (!signature?.signatureId) return false
    const expected = `SIG-${digest(`${signature.name}|${signature.role}|${signature.courseCode}|${signature.signedAt}`)}`
    return expected === signature.signatureId
}

export const addSignature = (workflow = {}, signature) => {
    if (!signature) return workflow
    const existing = (workflow.signatures || []).filter(s => s.role !== signature.role)
    return { ...workflow, signatures: [...existing, signature] }
}

// ------------------------------------------------- consolidated status ---

// Program Head → Director of Libraries → Industry Consultant → Dean (final,
// with a date approved) → VPAA (read-only). The Dean is the last approver; the
// VPAA only ever sees what is already approved.
export const APPROVER_CHAIN = [
    { role: 'program-head', label: 'Program Head', path: ['parallelReview', 'program_head'] },
    { role: 'director-of-libraries', label: 'Director of Libraries', path: ['parallelReview', 'library_director'] },
    { role: 'industry-consultant', label: 'Industry Consultant', path: ['parallelReview', 'industry_consultant'] },
    { role: 'dean', label: 'Dean', path: ['dean'], final: true },
    { role: 'vpaa', label: 'VPAA', path: ['vpaa'], readOnly: true }
]

const readPath = (obj, path) => path.reduce((acc, key) => (acc ? acc[key] : undefined), obj)

// "consolidated status po sya" [53:22] — one row per approver: where the item
// is, who has acted and who has not.
export const consolidatedStatus = (workflow = {}) => {
    const stage = workflow.currentStage || 'submitted'
    const steps = APPROVER_CHAIN.map(step => {
        const node = readPath(workflow, step.path) || {}
        const done = node.status === 'done'
        return {
            role: step.role,
            label: step.label,
            final: !!step.final,
            readOnly: !!step.readOnly,
            status: done ? 'approved' : (stage === 'returned' ? 'returned' : 'pending'),
            completedAt: node.completedAt || null,
            signature: (workflow.signatures || []).find(s => s.role === step.role) || null
        }
    })

    const approvers = steps.filter(s => !s.readOnly)
    const approved = approvers.filter(s => s.status === 'approved')
    return {
        stage,
        steps,
        approvedCount: approved.length,
        pendingCount: approvers.length - approved.length,
        awaiting: approvers.filter(s => s.status !== 'approved').map(s => s.label),
        isFullyApproved: stage === 'approved' || approvers.every(s => s.status === 'approved'),
        dateApproved: steps.find(s => s.final)?.completedAt || null
    }
}

// Which stage each role is allowed to act on, so one component can be reused
// across the whole chain without any role acting out of turn.
export const canActOnStage = (roleKey, workflow = {}) => {
    const role = normalizeRoleKey(roleKey)
    const stage = workflow.currentStage || 'submitted'
    if (role === 'vpaa') return false                       // read access only
    const status = consolidatedStatus(workflow)
    if (role === 'instructor') {
        // The plan is the instructor's until an approver has acted on it, and
        // again once it comes back. `defaultWorkflow` starts a never-submitted
        // plan at 'submitted', so the stage alone cannot say.
        if (stage === 'approved') return false
        return stage === 'returned' || status.approvedCount === 0
    }
    const step = status.steps.find(s => s.role === role)
    if (!step) return false
    if (step.status === 'approved') return false
    if (step.final) {
        // The Dean is final: everybody before them has to be done first.
        return status.steps.filter(s => !s.final && !s.readOnly).every(s => s.status === 'approved')
    }
    return stage !== 'approved'
}

export default {
    validateReturn,
    COMMENT_TYPES,
    commentTypeMeta,
    isActionableComment,
    encodeCommentType,
    parseCommentType,
    checkText,
    hasBlockingTextIssues,
    buildSignature,
    verifySignature,
    addSignature,
    APPROVER_CHAIN,
    consolidatedStatus,
    canActOnStage
}
