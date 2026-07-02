export const ALLOWED_ROLES = {
  instructor: ['instructor'],
  'program-head': ['program-head', 'program_head'],
  dean: ['dean'],
  'director-of-libraries': ['director-of-libraries', 'director_of_libraries'],
  'industry-consultant': ['industry-consultant', 'industry_consultant'],
  'vpaa': ['vpaa', 'vpaa']
}

export const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return (user.role || '').toLowerCase().replace(/\s+/g, '-')
  } catch {
    return ''
  }
}

export const hasRole = (requiredRoles) => {
  const userRole = getUserRole()
  if (!userRole || !requiredRoles || requiredRoles.length === 0) return false
  return requiredRoles.some(r => {
    const synonyms = ALLOWED_ROLES[r] || [r]
    return synonyms.some(s => userRole.includes(s.replace('-', '')) || s === userRole)
  })
}

export const requireRole = (requiredRoles) => {
  if (!hasRole(requiredRoles)) {
    throw new Error('Unauthorized: insufficient permissions')
  }
  return true
}

export const getUserId = () => {
  try {
    return parseInt(localStorage.getItem('userId') || '0')
  } catch {
    return 0
  }
}

export const getUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.name || ''
  } catch {
    return ''
  }
}
