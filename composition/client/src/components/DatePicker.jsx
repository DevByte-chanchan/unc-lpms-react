import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'react-feather'
import styles from '../styles/DatePicker.module.sass'

// A date field with a calendar that looks like the rest of the app, in place of the browser's own date popup (which
// cannot be styled). The value is a day as 'YYYY-MM-DD', or '' for none. Keys: arrows move by a day or a week,
// PageUp / PageDown by a month, Enter picks, Escape closes.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const POPOVER_W = 296
const POPOVER_H = 372

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`
const parse = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  return match ? { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) } : null
}
const shift = (value, days) => {
  const p = parse(value); if (!p) return value
  const date = new Date(Date.UTC(p.y, p.m, p.d + days))
  return iso(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}
const shiftMonth = (value, months) => {
  const p = parse(value); if (!p) return value
  const target = new Date(Date.UTC(p.y, p.m + months, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return iso(target.getUTCFullYear(), target.getUTCMonth(), Math.min(p.d, last))
}
const todayIso = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()) }
const labelOf = (value) => { const p = parse(value); return p ? `${p.d} ${SHORT[p.m]} ${p.y}` : '' }

const DatePicker = ({ id, value, onChange, placeholder = 'Select a date', ariaLabel }) => {
  const [open, setOpen] = useState(false)
  const [focusDay, setFocusDay] = useState(value || todayIso())
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const field = useRef(null)
  const popover = useRef(null)

  const show = () => {
    const rect = field.current.getBoundingClientRect()
    const below = rect.bottom + 6 + POPOVER_H <= window.innerHeight
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - POPOVER_W - 8)),
      top: below ? rect.bottom + 6 : Math.max(8, rect.top - POPOVER_H - 6)
    })
    setFocusDay(value || todayIso())
    setOpen(true)
  }
  const close = useCallback(() => { setOpen(false); field.current?.focus() }, [])
  const pick = (day) => { onChange(day); close() }

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (popover.current?.contains(event.target) || field.current?.contains(event.target)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('resize', onResize)
    return () => { document.removeEventListener('mousedown', onPointer); window.removeEventListener('resize', onResize) }
  }, [open])

  // keep the keyboard focus on the day that is "current" in the grid
  useEffect(() => { if (open) popover.current?.querySelector('[data-focus="true"]')?.focus() }, [open, focusDay])

  const onGridKey = (event) => {
    const moves = { ArrowLeft: () => shift(focusDay, -1), ArrowRight: () => shift(focusDay, 1), ArrowUp: () => shift(focusDay, -7), ArrowDown: () => shift(focusDay, 7), PageUp: () => shiftMonth(focusDay, -1), PageDown: () => shiftMonth(focusDay, 1) }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (moves[event.key]) { event.preventDefault(); setFocusDay(moves[event.key]()) }
  }

  const view = parse(focusDay) || parse(todayIso())
  const first = new Date(Date.UTC(view.y, view.m, 1))
  const start = shift(iso(view.y, view.m, 1), -first.getUTCDay())
  const days = Array.from({ length: 42 }, (_, i) => shift(start, i))
  const today = todayIso()

  return (
    <>
      <button ref={field} id={id} type="button" className={styles.field} onClick={() => (open ? close() : show())}
        aria-haspopup="dialog" aria-expanded={open} aria-label={ariaLabel}>
        <span className={value ? styles.value : styles.placeholder}>{value ? labelOf(value) : placeholder}</span>
        <Calendar size={16} aria-hidden="true" />
      </button>

      {open && createPortal(
        <div ref={popover} role="dialog" aria-label="Choose a date" className={styles.popover} style={{ left: pos.left, top: pos.top }} onKeyDown={onGridKey}>
          <div className={styles.head}>
            <button type="button" className="app-icon-btn" onClick={() => setFocusDay(shiftMonth(focusDay, -1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
            <div className={styles.title} aria-live="polite">{MONTHS[view.m]} {view.y}</div>
            <button type="button" className="app-icon-btn" onClick={() => setFocusDay(shiftMonth(focusDay, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
          </div>
          <div className={styles.week} aria-hidden="true">{WEEK.map(name => <span key={name}>{name}</span>)}</div>
          <div className={styles.grid} role="grid">
            {days.map(day => {
              const p = parse(day)
              return (
                <button key={day} type="button" role="gridcell" tabIndex={day === focusDay ? 0 : -1} data-focus={day === focusDay}
                  aria-selected={day === value} aria-label={`${p.d} ${MONTHS[p.m]} ${p.y}`}
                  className={`${styles.day} ${p.m !== view.m ? styles.outside : ''} ${day === today ? styles.today : ''} ${day === value ? styles.selected : ''}`}
                  onClick={() => pick(day)}>{p.d}</button>
              )
            })}
          </div>
          <div className={styles.foot}>
            <button type="button" className={styles.link} onClick={() => pick(today)}>Today</button>
            <button type="button" className={styles.link} onClick={() => pick('')} disabled={!value}>Clear</button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export default DatePicker
