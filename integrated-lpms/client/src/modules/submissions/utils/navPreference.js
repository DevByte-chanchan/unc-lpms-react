// Whether the left sidebar is collapsed to icons. Remembered in this browser only; if storage is
// unavailable (a private window, blocked site data) the sidebar simply starts open every time.
const KEY = 'lpms_nav_collapsed'

export const readCollapsed = (storage) => {
  try { return storage?.getItem(KEY) === '1' } catch { return false }
}

export const writeCollapsed = (storage, collapsed) => {
  try { storage?.setItem(KEY, collapsed ? '1' : '0') } catch { /* not remembered */ }
}
