// Helpers of the sign-in screens (components/AccountAuth.jsx), kept apart so that file only exports components.

export const cx = (...c) => c.filter(Boolean).join(' ')

// Account e-mails are university addresses; "junar.danila" is completed to "junar.danila@unc.edu.ph".
export const ALLOWED_EMAIL_DOMAIN = String(import.meta.env?.VITE_ALLOWED_EMAIL_DOMAIN || 'unc.edu.ph').toLowerCase()
export const completeEmail = (raw) => {
  const value = String(raw || '').trim()
  return !value || value.includes('@') ? value : `${value}@${ALLOWED_EMAIL_DOMAIN}`
}

// One line per role, for "Continue as...".
export const ROLE_DESCRIPTIONS = {
  instructor: 'Write the learning plans of the courses assigned to you.',
  'program-head': 'Your program’s courses, their reviews, consultants and due dates.',
  'director-of-libraries': 'Review the references of submitted plans; keep the reference library.',
  'industry-consultant': 'Comment on the plans of the courses you consult on.',
  dean: 'Final review of your department’s learning plans.',
  vpaa: 'Approved learning plans, and the user accounts.',
  superuser: 'Accounts and the audit trail.'
}

// The rules a new password must meet (the server checks them again).
export const MIN_PASSWORD = 8
export const newPasswordChecks = (next, confirm) => [
  { ok: next.length >= MIN_PASSWORD, label: `At least ${MIN_PASSWORD} characters` },
  { ok: /[A-Za-z]/.test(next) && /[0-9]/.test(next), label: 'At least one letter and one number' },
  { ok: next !== '' && next === confirm, label: 'Matches the confirmation' }
]
