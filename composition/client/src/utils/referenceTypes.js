// The reference types and their fields, as the server defines them (server/config/referenceTypes.js,
// served by GET /api/references/types). This module only holds what the server sent; it has no
// type list of its own, so the form and the type rules cannot drift from the server's.
//
// Pure (no imports) so it can be used by every reference helper and tested under plain node.
// Shape: [{ key, label, group, fields: [{ key, label, kind, required }] }]

let registry = []

export const setReferenceTypes = (types) => { registry = Array.isArray(types) ? types : [] }
export const getReferenceTypes = () => registry

// Exact match on the key; there is no substring or case-insensitive guessing.
export const referenceTypeOf = (key) => registry.find(type => type.key === key) || null
export const hasReferenceType = (key) => referenceTypeOf(key) !== null
export const referenceTypeLabel = (key) => referenceTypeOf(key)?.label || ''

// "Online Subscription (e.g., O'Reilly)" -> "Online Subscription": the part before any bracket,
// for tabs and badges where the full label is too long.
export const shortTypeLabel = (key) => referenceTypeLabel(key).replace(/\s*\(.*\)\s*$/, '') || String(key || '')

// The fields a form should show for a type, required ones first (the server already orders them).
export const fieldsFor = (key) => referenceTypeOf(key)?.fields || []

// Presence check for instant feedback; the server remains the authority on every rule.
export const missingRequired = (key, values = {}) => {
  const errors = {}
  if (!hasReferenceType(key)) return { type: 'Please select a reference type.' }
  for (const field of fieldsFor(key)) {
    if (field.required && !String(values[field.key] ?? '').trim()) errors[field.key] = `${field.label} is required.`
  }
  return errors
}

// The same format rules the server applies (server/utils/referenceValidation.js), checked as a field is left so a
// mistake shows at once instead of after Save. The server still checks everything (it also verifies an ISBN's check
// digit); this only gives earlier, identical feedback.
export const YEAR_MIN = 1900
export const yearMax = (now = new Date()) => now.getFullYear() + 1
export const fieldError = (field, raw, now = new Date()) => {
  const value = String(raw ?? '').trim()
  if (!value) return field.required ? `${field.label} is required.` : null
  switch (field.kind) {
    case 'year': {
      if (!/^\d{4}$/.test(value)) return `${field.label} must be a 4-digit year (e.g., 2023).`
      const year = Number(value)
      return year >= YEAR_MIN && year <= yearMax(now) ? null : `${field.label} must be between ${YEAR_MIN} and ${yearMax(now)}.`
    }
    case 'isbn': {
      if (!/^[0-9Xx][0-9Xx -]*$/.test(value)) return 'ISBN may contain only digits, hyphens, spaces and X.'
      const digits = value.replace(/[ -]/g, '')
      return digits.length === 10 || digits.length === 13 ? null : 'ISBN must have 10 or 13 digits.'
    }
    case 'url': {
      try {
        const url = new URL(value)
        return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') ? null : 'Enter a valid http(s) link (e.g., https://example.com).'
      } catch { return 'Enter a valid http(s) link (e.g., https://example.com).' }
    }
    case 'count':
      return /^[0-9]+$/.test(value) && Number(value) <= (field.max || 9999) ? null : `${field.label} must be a whole number from 0 to ${field.max || 9999}.`
    case 'date': {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) return `${field.label} must be a date.`
      return value <= now.toISOString().slice(0, 10) ? null : `${field.label} cannot be in the future.`
    }
    default:
      return field.max && value.length > field.max ? `${field.label} must be at most ${field.max} characters.` : null
  }
}

// Every field's error for a type (required + format), for the check before Save.
export const formErrors = (key, values = {}, now = new Date()) => {
  if (!hasReferenceType(key)) return { type: 'Please select a reference type.' }
  const errors = {}
  for (const field of fieldsFor(key)) {
    const error = fieldError(field, values[field.key], now)
    if (error) errors[field.key] = error
  }
  return errors
}

// A link typed without its scheme ("example.com/book") is completed to https://, so it is accepted rather than refused.
export const completeLink = (raw) => {
  const value = String(raw ?? '').trim()
  return value && !/^[a-z][a-z0-9+.-]*:/i.test(value) && value.includes('.') ? `https://${value}` : value
}
