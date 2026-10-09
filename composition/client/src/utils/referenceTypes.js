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
