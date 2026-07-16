/**
 * Demo seed comments have been removed — real comments come from the server
 * (approver sidebar POSTs to /api/comments/by-course; the sidebar syncs from
 * /api/comments/by-course/:code).
 *
 * This function now only SWEEPS any leftover seed entries from localStorage
 * so old demo data (seed-hci / seed-se / seed-mg / seed-pt / seed-stat ...)
 * disappears for every course on next page load.
 */
export function seedDummyComments() {
  try {
    const raw = localStorage.getItem('approval_comments_v1')
    const parsed = raw ? JSON.parse(raw) : []
    const list = Array.isArray(parsed) ? parsed : []
    const cleaned = list.filter(c => !String(c.id || '').startsWith('seed-'))
    if (cleaned.length !== list.length) {
      localStorage.setItem('approval_comments_v1', JSON.stringify(cleaned))
      if (import.meta.env.DEV) console.log('Removed', list.length - cleaned.length, 'leftover seed comments')
    }
  } catch (e) {
    console.error('Failed to sweep seed comments', e)
  }
}
