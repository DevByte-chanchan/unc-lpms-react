export const reviewerSeeds = [
  { name: 'GARCIA, CARLOS', role: 'Director of Libraries' },
  { name: 'REYES, AGNES', role: 'Dean' },
  { name: 'DANILA, JUNAR', role: 'Program Head' },
  { name: 'CRUZ, ROBERTO', role: 'Industry Consultant' },
  { name: 'CASIMERO, DANNY', role: 'Instructor' },
]

export const REVIEWER_BY_ROLE_MAP = {
  'director-of-libraries': reviewerSeeds[0],
  'dean': reviewerSeeds[1],
  'program-head': reviewerSeeds[2],
  'industry-consultant': reviewerSeeds[3],
  'instructor': reviewerSeeds[4],
}

export const ROLE_LABEL_MAP = {
  'program-head': 'Program Head',
  'dean': 'Dean',
  'industry-consultant': 'Industry Consultant',
  'director-of-libraries': 'Director of Libraries',
  'instructor': 'Instructor',
}

export const getReviewerByRole = (role) =>
  REVIEWER_BY_ROLE_MAP[role] || reviewerSeeds[0]

export const getReviewerSeedData = (index = 0) =>
  reviewerSeeds[index % reviewerSeeds.length]

export const normalizeRoleKey = (raw) => {
  if (!raw) return ''
  const r = String(raw).toLowerCase()
  if (r.includes('program')) return 'program-head'
  if (r.includes('dean')) return 'dean'
  if (r.includes('industry')) return 'industry-consultant'
  if (r.includes('library') || r.includes('libraries')) return 'director-of-libraries'
  if (r.includes('instructor')) return 'instructor'
  return r.replace(/[_\s]+/g, '-')
}

export const isDeprecated = (ref, currentYear = new Date().getFullYear()) => {
  if (!ref || !ref.year) return false
  const y = typeof ref.year === 'string' ? parseInt(ref.year, 10) : ref.year
  return !isNaN(y) && currentYear - y >= 5
}

export const hasIssues = (ref) => ref?.hasIssue === true

const ROLE_COLORS = {
  'Program Head': '#2d3748',
  'Dean': '#2d3748',
  'Director of Libraries': '#2d3748',
  'Industry Consultant': '#2d3748',
}

export const getRoleColor = (role) => ROLE_COLORS[role] || '#2d3748'

export const getComponentTags = (comment) => {
  const components = comment?.components || {}
  const tags = []
  const isSelected = (key) => {
    const v = components[key]
    return v === true || v === 1 || v === '1' || v === 'true'
  }
  if (isSelected('references')) tags.push('References')
  if (isSelected('grading')) tags.push('Grading Criteria')
  if (comment?.coverageType) {
    const ct = String(comment.coverageType).trim()
    if (ct) tags.push(`Coverage: ${ct}`)
  }
  return tags
}

export const isRecent = (iso, days = 7) => {
  if (!iso) return false
  try {
    const then = new Date(iso)
    const diff = Date.now() - then.getTime()
    return diff < days * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}
