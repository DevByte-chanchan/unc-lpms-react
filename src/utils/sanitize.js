// Escaping for generated documents (ported from the Learning Plan export,
// feature/learning-plan-submissions-management-v2 composition/client/src/utils/sanitize.js).
// Every value written into a generated HTML document goes through escapeHtml,
// so text a person typed is always shown as text, never run as markup.

const ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'/]/g, (char) => ENTITY_MAP[char]);
};

// Escaped text with its line breaks kept: newlines become <br> AFTER escaping,
// so the only markup in the result is the <br> we add.
export const escapeMultiline = (str) => escapeHtml(str).replace(/\r\n|\r|\n/g, '<br>');

export const sanitizeFileName = (name) => {
  if (typeof name !== 'string') return 'file';
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 255);
};

// A link target that is safe to put in an href/src: a same-origin path, or http(s)
// without credentials. Anything else (javascript:, data:, control characters) → ''.
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim().slice(0, 2000);
  const hasControlCharacter = Array.from(trimmed).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!trimmed || hasControlCharacter) return '';
  if (/^\/[a-zA-Z0-9/._-]*$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (parsed.username || parsed.password || !parsed.hostname) return '';
    return trimmed;
  } catch {
    return '';
  }
};

// Only an embedded PNG/JPEG data URI (the seal) may be used as an <img> source.
const IMAGE_URI = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
export const imageDataSrc = (value) => (typeof value === 'string' && IMAGE_URI.test(value) ? value : '');
// The syllabus builder's name for the same check (e-signature images).
export const signatureImageSrc = imageDataSrc;
