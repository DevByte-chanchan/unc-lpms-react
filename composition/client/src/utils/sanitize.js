const ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
}

export const escapeHtml = (str) => {
  if (str === null || str === undefined) return ''
  return String(str).replace(/[&<>"'/]/g, (char) => ENTITY_MAP[char])
}

export const sanitizeString = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim().slice(0, maxLength)
  return escapeHtml(trimmed)
}

export const sanitizeRichText = (input, maxLength = 10000) => {
  if (typeof input !== 'string') return ''
  const trimmed = input.trim().slice(0, maxLength)
  return trimmed.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript\s*:/gi, '')
}

export const sanitizeObject = (obj, maxDepth = 5, currentDepth = 0) => {
  if (currentDepth > maxDepth) return {}
  if (obj === null || obj === undefined) return {}
  if (typeof obj === 'string') return sanitizeString(obj)
  if (typeof obj === 'number') return obj
  if (typeof obj === 'boolean') return obj
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, maxDepth, currentDepth + 1))
  if (typeof obj === 'object') {
    const sanitized = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value, maxDepth, currentDepth + 1)
    }
    return sanitized
  }
  return obj
}

export const sanitizeFileName = (name) => {
  if (typeof name !== 'string') return 'file'
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255)
}

export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return ''
  const trimmed = url.trim().slice(0, 2000)
  if (/^(https?:\/\/)/i.test(trimmed)) return trimmed
  if (/^\/[a-zA-Z0-9/._-]*$/.test(trimmed)) return trimmed
  return ''
}
