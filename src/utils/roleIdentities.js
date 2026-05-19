/**
 * Centralized role identity configuration.
 * Single source of truth for all role names across the app.
 */
const ROLE_IDENTITIES = {
  instructor: {
    name: 'CASIMERO, DANNY',
    displayName: 'Danny Casimero',
    role: 'Instructor'
  },
  'program-head': {
    name: 'DANILA, JUNAR',
    displayName: 'Junar Danila',
    role: 'Program Head'
  },
  dean: {
    name: 'REYES, AGNES',
    displayName: 'Agnes Reyes',
    role: 'Dean'
  },
  'director-of-libraries': {
    name: 'SANTOS, MARIA',
    displayName: 'Maria Santos',
    role: 'Director of Libraries'
  },
  'industry-consultant': {
    name: 'CRUZ, ROBERTO',
    displayName: 'Roberto Cruz',
    role: 'Industry Consultant'
  },
  'hr-staff': {
    name: 'DELA CRUZ, ANA',
    displayName: 'Ana Dela Cruz',
    role: 'HR Staff'
  }
}

export const getRoleIdentity = (roleKey) => {
  return ROLE_IDENTITIES[roleKey] || ROLE_IDENTITIES.instructor
}

export const getRoleName = (roleKey) => {
  return (ROLE_IDENTITIES[roleKey] || ROLE_IDENTITIES.instructor).name
}

export const getRoleDisplayName = (roleKey) => {
  return (ROLE_IDENTITIES[roleKey] || ROLE_IDENTITIES.instructor).displayName
}

export default ROLE_IDENTITIES
