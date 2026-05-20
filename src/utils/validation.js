export const isNonEmpty = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export const isValidCourseCode = (code) => {
  if (typeof code !== 'string') return false
  return /^[A-Za-z0-9\s-]{2,20}$/.test(code.trim())
}

export const isValidId = (id) => {
  if (typeof id === 'number') return Number.isFinite(id) && id > 0
  if (typeof id === 'string') return /^\d+$/.test(id.trim())
  return false
}

export const isValidPercentage = (value) => {
  const num = parseFloat(value)
  return !isNaN(num) && num >= 0 && num <= 100
}

export const isValidYear = (year) => {
  const num = parseInt(year)
  const currentYear = new Date().getFullYear()
  return !isNaN(num) && num >= 1990 && num <= currentYear + 5
}

export const isValidSemester = (sem) => {
  return ['1st', '2nd', 'summer', '1', '2'].includes(String(sem))
}

export const validateRequired = (fields, data) => {
  const errors = {}
  for (const [key, label] of Object.entries(fields)) {
    const value = data[key]
    if (!isNonEmpty(value)) {
      errors[key] = `${label} is required`
    }
  }
  return errors
}

export const validateLength = (value, min = 0, max = Infinity, label = 'Field') => {
  if (typeof value !== 'string') return `${label} must be a string`
  const trimmed = value.trim()
  if (trimmed.length < min) return `${label} must be at least ${min} characters`
  if (trimmed.length > max) return `${label} must not exceed ${max} characters`
  return null
}

export const validateForm = (data, rules) => {
  const errors = {}
  for (const [field, fieldRules] of Object.entries(rules)) {
    const value = data[field]
    if (fieldRules.required && !isNonEmpty(value)) {
      errors[field] = fieldRules.label ? `${fieldRules.label} is required` : `${field} is required`
      continue
    }
    if (value && fieldRules.minLength && typeof value === 'string' && value.trim().length < fieldRules.minLength) {
      errors[field] = `${fieldRules.label || field} must be at least ${fieldRules.minLength} characters`
    }
    if (value && fieldRules.maxLength && typeof value === 'string' && value.trim().length > fieldRules.maxLength) {
      errors[field] = `${fieldRules.label || field} must not exceed ${fieldRules.maxLength} characters`
    }
    if (value && fieldRules.pattern && !fieldRules.pattern.test(value)) {
      errors[field] = fieldRules.patternMessage || `${fieldRules.label || field} format is invalid`
    }
  }
  return errors
}

export const hasErrors = (errors) => Object.keys(errors).length > 0
