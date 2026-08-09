// Learning-plan status, deadlines and reminders.
//
// "nasa tracking... learning plan status, that is in Edrian's module" [08:33] —
// so this file is the single read model for "where is this plan?". Everything
// else (tables, badges, the tracker page) derives from `planStatusFor`; nothing
// re-derives a stage from its own copy of the workflow.
//
// It also answers the program head's chasing problem: who has not submitted
// [08:16], and deadlines computed from the uploaded academic calendar with
// automatic notices to late faculty and the PH [08:51].

import { consolidatedStatus } from './reviewGate.js'

const CALENDAR_KEY = 'lpsm_academic_calendar_v1'
const NOTIFICATIONS_KEY = 'lpsm_notifications_v1'

const readJson = (key, fallback) => {
    try {
        const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(key)
        const parsed = raw ? JSON.parse(raw) : null
        return parsed ?? fallback
    } catch {
        return fallback
    }
}

const writeJson = (key, value) => {
    try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(key, JSON.stringify(value))
    } catch (e) {
        console.error('Failed to persist plan status data', e)
    }
}

// ------------------------------------------------------------- stages ---

export const PLAN_STAGES = {
    draft: { key: 'draft', label: 'Draft', tone: 'neutral' },
    submitted: { key: 'submitted', label: 'Pending review', tone: 'info' },
    parallel_review: { key: 'parallel_review', label: 'Under review', tone: 'info' },
    returned: { key: 'returned', label: 'Returned for revision', tone: 'warn' },
    dean: { key: 'dean', label: 'Awaiting the Dean', tone: 'info' },
    approved: { key: 'approved', label: 'Approved', tone: 'good' }
}

export const stageMeta = (stage) => PLAN_STAGES[stage] || PLAN_STAGES.draft

// One plan's status, derived only from its stored workflow.
export const planStatusFor = (courseCode, workflow = {}, extra = {}) => {
    const rolled = consolidatedStatus(workflow)
    const stage = workflow.currentStage || 'draft'
    const submittedAt = workflow.submittedAt || null
    return {
        code: courseCode,
        name: extra.name || '',
        instructor: extra.instructor || '',
        stage,
        label: stageMeta(stage).label,
        tone: stageMeta(stage).tone,
        submitted: !!submittedAt || stage !== 'draft',
        submittedAt,
        approvedCount: rolled.approvedCount,
        pendingCount: rolled.pendingCount,
        awaiting: rolled.awaiting,
        steps: rolled.steps,
        isFullyApproved: rolled.isFullyApproved,
        dateApproved: rolled.dateApproved
    }
}

export const rollupPlans = (plans = []) => ({
    total: plans.length,
    submitted: plans.filter(p => p.submitted).length,
    notSubmitted: plans.filter(p => !p.submitted).length,
    returned: plans.filter(p => p.stage === 'returned').length,
    approved: plans.filter(p => p.isFullyApproved).length
})

// "sasaro-saroon ko kada folder" [08:16] — this is the list that replaces that.
export const nonSubmitters = (plans = []) =>
    plans.filter(p => !p.submitted).map(p => ({ code: p.code, name: p.name, instructor: p.instructor }))

// -------------------------------------------------- academic calendar ---

export const DEFAULT_CALENDAR_RULES = {
    // "syllabus due about one week before classes start" [08:51]
    syllabusDueDaysBeforeClasses: 7,
    // How many days ahead of the deadline a reminder starts firing.
    reminderLeadDays: 7
}

export const getAcademicCalendar = () => readJson(CALENDAR_KEY, null)

export const setAcademicCalendar = (calendar) => {
    if (!calendar) return null
    writeJson(CALENDAR_KEY, calendar)
    return calendar
}

const toDate = (value) => {
    if (!value) return null
    const d = value instanceof Date ? value : new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

const iso = (date) => (date ? date.toISOString().slice(0, 10) : null)

const shiftDays = (date, days) => new Date(date.getTime() + days * 86400000)

const KEY_ALIASES = {
    startofclasses: 'startOfClasses',
    classesstart: 'startOfClasses',
    firstdayofclasses: 'startOfClasses',
    midtermgradesubmission: 'midtermGradeSubmission',
    midtermgrades: 'midtermGradeSubmission',
    finalgradesubmission: 'finalGradeSubmission',
    finalgrades: 'finalGradeSubmission',
    term: 'term',
    academicterm: 'term'
}

// Accepts what a spreadsheet upload produces: rows of [label, date] or objects
// keyed by column name. The uploaded calendar is what the deadlines come from —
// nothing here hard-codes a date.
export const parseCalendarUpload = (rows = []) => {
    const out = {}
    const assign = (label, value) => {
        const key = KEY_ALIASES[String(label || '').toLowerCase().replace(/[^a-z]/g, '')]
        if (!key) return
        if (key === 'term') { out.term = String(value).trim(); return }
        const d = toDate(value)
        if (d) out[key] = iso(d)
    }

    rows.forEach(row => {
        if (Array.isArray(row)) {
            assign(row[0], row[1])
        } else if (row && typeof row === 'object') {
            Object.entries(row).forEach(([k, v]) => assign(k, v))
        }
    })

    return Object.keys(out).length ? out : null
}

export const deriveDeadlines = (calendar, rules = DEFAULT_CALENDAR_RULES) => {
    const start = toDate(calendar?.startOfClasses)
    if (!start) return null
    const lead = Number(rules.syllabusDueDaysBeforeClasses ?? DEFAULT_CALENDAR_RULES.syllabusDueDaysBeforeClasses)
    return {
        term: calendar?.term || '',
        startOfClasses: iso(start),
        syllabusDue: iso(shiftDays(start, -lead)),
        midtermGradesDue: calendar?.midtermGradeSubmission || null,
        finalGradesDue: calendar?.finalGradeSubmission || null
    }
}

export const deadlineState = (deadlines, now = new Date(), rules = DEFAULT_CALENDAR_RULES) => {
    const due = toDate(deadlines?.syllabusDue)
    if (!due) return { state: 'no-calendar', daysLeft: null }
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000)
    const lead = Number(rules.reminderLeadDays ?? DEFAULT_CALENDAR_RULES.reminderLeadDays)
    if (daysLeft < 0) return { state: 'overdue', daysLeft }
    if (daysLeft <= lead) return { state: 'due-soon', daysLeft }
    return { state: 'upcoming', daysLeft }
}

// ------------------------------------------------------ notifications ---

// One reminder per late faculty member, plus one summary for the program head
// [08:51]. Deterministic ids so re-running on the same day does not duplicate.
export const buildReminders = (plans = [], deadlines = null, now = new Date()) => {
    const { state, daysLeft } = deadlineState(deadlines, now)
    if (state === 'no-calendar' || state === 'upcoming') return []

    const late = nonSubmitters(plans)
    if (late.length === 0) return []

    const day = now.toISOString().slice(0, 10)
    const overdue = state === 'overdue'
    const phrase = overdue
        ? `was due ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
        : `is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`

    const reminders = late.map(p => ({
        id: `rem-${day}-${p.code}`,
        to: p.instructor || 'Faculty',
        role: 'instructor',
        courseCode: p.code,
        severity: overdue ? 'overdue' : 'due-soon',
        createdAt: now.toISOString(),
        message: `${p.code} learning plan has not been submitted. Submission ${phrase} (${deadlines.syllabusDue}).`
    }))

    reminders.push({
        id: `rem-${day}-summary`,
        to: 'Program Head',
        role: 'program-head',
        courseCode: null,
        severity: overdue ? 'overdue' : 'due-soon',
        createdAt: now.toISOString(),
        message: `${late.length} learning plan${late.length === 1 ? '' : 's'} not yet submitted (${late.map(p => p.code).join(', ')}). Submission ${phrase}.`
    })

    return reminders
}

export const getNotifications = () => {
    const all = readJson(NOTIFICATIONS_KEY, [])
    return Array.isArray(all) ? all : []
}

// Merge on id so the same day's reminder is never queued twice.
export const pushNotifications = (notifications = []) => {
    const existing = getNotifications()
    const byId = new Map(existing.map(n => [n.id, n]))
    let added = 0
    notifications.forEach(n => {
        if (!byId.has(n.id)) {
            byId.set(n.id, { ...n, read: false })
            added += 1
        }
    })
    const merged = [...byId.values()]
    writeJson(NOTIFICATIONS_KEY, merged)
    return { added, notifications: merged }
}

export const notificationsFor = (roleKey, name = '') => getNotifications().filter(n =>
    n.role === roleKey && (!name || n.role !== 'instructor' || n.to === name || n.to === 'Faculty')
)

export const markNotificationsRead = (ids = []) => {
    const set = new Set(ids)
    const next = getNotifications().map(n => (set.has(n.id) ? { ...n, read: true } : n))
    writeJson(NOTIFICATIONS_KEY, next)
    return next
}

export default {
    PLAN_STAGES,
    stageMeta,
    planStatusFor,
    rollupPlans,
    nonSubmitters,
    DEFAULT_CALENDAR_RULES,
    getAcademicCalendar,
    setAcademicCalendar,
    parseCalendarUpload,
    deriveDeadlines,
    deadlineState,
    buildReminders,
    getNotifications,
    pushNotifications,
    notificationsFor,
    markNotificationsRead
}
