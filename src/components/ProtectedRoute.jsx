import React from 'react'
import { Navigate } from 'react-router-dom'
import { getRoleIdentity } from '../utils/roleIdentities'

const ALLOWED_ROLES = {
  instructor: ['instructor'],
  'program-head': ['program-head', 'program_head'],
  dean: ['dean'],
  'director-of-libraries': ['director-of-libraries', 'director_of_libraries'],
  'industry-consultant': ['industry-consultant', 'industry_consultant'],
  'oic-ovpaa': ['oic-ovpaa', 'oic_ovpaa']
}

const ProtectedRoute = ({ children, allowedRoles, fallbackPath = '/' }) => {
  try {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
    const userRole = (storedUser.role || '').toLowerCase().replace(/\s+/g, '-')

    if (!userRole) {
      return <Navigate to={fallbackPath} replace />
    }

    const allowed = allowedRoles.some(r => {
      const synonyms = ALLOWED_ROLES[r] || [r]
      return synonyms.some(s => userRole.includes(s.replace('-', '')) || s === userRole)
    })

    if (!allowed) {
      return <Navigate to={fallbackPath} replace />
    }

    return children
  } catch {
    return <Navigate to={fallbackPath} replace />
  }
}

export default ProtectedRoute
