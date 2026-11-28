import { useEffect } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])'

// Moves focus into an open dialog, keeps Tab and Shift+Tab inside it, and gives focus back to whatever opened it
// when it closes. `ref` points at the dialog element. Escape stays with each dialog, since some close in steps.
export default function useDialogFocus(ref, open) {
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement
    const items = () => [...(ref.current?.querySelectorAll(FOCUSABLE) || [])].filter(el => el.offsetParent !== null || el === document.activeElement)
    const frame = requestAnimationFrame(() => {
      const box = ref.current
      if (!box || box.contains(document.activeElement)) return
      const first = items()[0]
      if (first) first.focus()
      else { box.setAttribute('tabindex', '-1'); box.focus() }
    })
    const onKey = (event) => {
      if (event.key !== 'Tab' || !ref.current) return
      const list = items()
      if (list.length === 0) { event.preventDefault(); return }
      const first = list[0]
      const last = list[list.length - 1]
      const inside = ref.current.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || !inside)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !inside)) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKey)
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus()
    }
  }, [ref, open])
}
