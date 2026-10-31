// The two letters on the avatar. Names are written "LAST, FIRST" here, so "DANILA, JUNAR" is "JD";
// a name without a comma uses its first and last word.
export const initialsOf = (name) => {
  const text = String(name || '').trim()
  if (!text) return '?'
  const comma = text.split(',').map(part => part.trim()).filter(Boolean)
  const [first, last] = comma.length >= 2
    ? [comma[1].split(/\s+/)[0], comma[0].split(/\s+/)[0]]
    : [text.split(/\s+/)[0], text.split(/\s+/).slice(-1)[0]]
  return `${(first || '')[0] || ''}${(last && last !== first ? last : '')[0] || ''}`.toUpperCase() || '?'
}
