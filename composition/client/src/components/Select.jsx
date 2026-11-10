import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'react-feather'
import styles from '../styles/Select.module.sass'

// A drop-down list in the app's look, in place of the browser's own <select> popup (which cannot be styled). It is a
// drop-in: it takes the same <option> children, `value`, `onChange` (called with { target: { value, name } }),
// `disabled`, `id`, `name` and `aria-label`. Extra props: `block` (fill the width) and `size` ('lg' is 40px tall).
// Keys: Up / Down / Home / End move, Enter or Space picks, Escape closes, a letter jumps to an option that starts with it.
const POPOVER_MAX = 288

const collect = (children, found = []) => {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return
    if (child.type === Fragment || child.type === 'optgroup') { collect(child.props.children, found); return }
    if (child.type !== 'option') return
    const text = Children.toArray(child.props.children).join('')
    found.push({ value: child.props.value !== undefined ? String(child.props.value) : text, label: text, disabled: Boolean(child.props.disabled) })
  })
  return found
}

const Select = ({ value, onChange, children, disabled = false, id, name, block = false, size = 'md', variant = '', title, placeholder = 'Select…', ...rest }) => {
  const options = collect(children)
  const current = options.find(option => option.value === String(value ?? ''))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, up: false })
  const trigger = useRef(null)
  const list = useRef(null)
  const listId = useId()

  const show = () => {
    if (disabled) return
    const rect = trigger.current.getBoundingClientRect()
    const height = Math.min(POPOVER_MAX, options.length * 36 + 12)
    const up = rect.bottom + 6 + height > window.innerHeight && rect.top > height + 12
    setPos({ left: rect.left, top: up ? rect.top - 6 : rect.bottom + 6, width: rect.width, up })
    setActive(Math.max(0, options.findIndex(option => option.value === String(value ?? ''))))
    setOpen(true)
  }
  const close = useCallback(() => { setOpen(false); trigger.current?.focus() }, [])
  const pick = (option) => {
    if (option.disabled) return
    onChange?.({ target: { value: option.value, name }, currentTarget: { value: option.value, name } })
    close()
  }

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (list.current?.contains(event.target) || trigger.current?.contains(event.target)) return
      setOpen(false)
    }
    // the page moving under the list closes it; the list scrolling itself does not
    const onMove = (event) => { if (event?.type === 'scroll' && list.current?.contains(event.target)) return; setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => { document.removeEventListener('mousedown', onPointer); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true) }
  }, [open])

  // the list is as wide as its longest option; slide it left rather than let the screen edge clip it
  useLayoutEffect(() => {
    if (!open || !list.current) return
    const room = window.innerWidth - 12 - list.current.offsetWidth
    if (pos.left > room) setPos(previous => ({ ...previous, left: Math.max(12, room) }))
  }, [open, pos.left])

  useEffect(() => { if (open) list.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }) }, [open, active])

  const step = (from, delta) => {
    let index = from
    for (let i = 0; i < options.length; i++) {
      index = (index + delta + options.length) % options.length
      if (!options[index].disabled) return index
    }
    return from
  }

  const onKeyDown = (event) => {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); show() }
      return
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive(step(active, 1)) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(step(active, -1)) }
    else if (event.key === 'Home') { event.preventDefault(); setActive(step(-1, 1)) }
    else if (event.key === 'End') { event.preventDefault(); setActive(step(options.length, -1)) }
    else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (options[active]) pick(options[active]) }
    else if (event.key.length === 1) {
      const hit = options.findIndex((option, index) => index > active && !option.disabled && option.label.toLowerCase().startsWith(event.key.toLowerCase()))
      const wrap = hit >= 0 ? hit : options.findIndex(option => !option.disabled && option.label.toLowerCase().startsWith(event.key.toLowerCase()))
      if (wrap >= 0) setActive(wrap)
    } else if (event.key === 'Tab') setOpen(false)
  }

  return (
    <>
      <button ref={trigger} id={id} type="button" title={title} disabled={disabled} onClick={() => (open ? close() : show())} onKeyDown={onKeyDown}
        className={`${styles.trigger} ${size === 'lg' ? styles.lg : ''} ${block ? styles.block : ''} ${variant === 'term' ? styles.term : ''} ${variant === 'inline' ? styles.inline : ''}`}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-label={rest['aria-label']}>
        <span className={current ? styles.value : styles.placeholder}>{current ? current.label : placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
      </button>

      {open && createPortal(
        <ul ref={list} id={listId} role="listbox" aria-label={rest['aria-label']} className={styles.list}
          style={{ left: pos.left, minWidth: pos.width, maxWidth: 'calc(100vw - 24px)', ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top }) }}>
          {options.map((option, index) => (
            <li key={`${option.value}-${index}`} role="option" title={option.label} aria-selected={current === option} aria-disabled={option.disabled || undefined}
              data-active={index === active} className={`${styles.option} ${index === active ? styles.active : ''} ${option.disabled ? styles.off : ''}`}
              onMouseEnter={() => setActive(index)} onClick={() => pick(option)}>
              <span>{option.label}</span>
              {current === option && <Check size={14} aria-hidden="true" />}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </>
  )
}

export default Select
