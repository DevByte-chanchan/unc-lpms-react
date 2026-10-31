import React from 'react'
import { Link } from 'react-router-dom'

// A row of small count cards above a list: a label, a big number, and an optional line under it. A card
// with onClick is a button (the list's own tabs use it to switch), one with `to` is a link, and the
// selected one is outlined. Nothing here decides what to count; the page passes the numbers in.
const BASE = {
  display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'left', padding: '12px 16px', minWidth: 0,
  border: '1px solid var(--line)', borderRadius: 'var(--radius-md)', background: 'var(--surface)',
  color: 'var(--ink)', font: 'var(--fw-normal) var(--fs-md) var(--font-ui)', textDecoration: 'none'
}

const Body = ({ card }) => (
  <>
    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-muted)' }}>{card.label}</span>
    <span style={{ fontSize: 24, fontWeight: 'var(--fw-semibold)', lineHeight: 1.2, color: card.tone === 'warn' && card.value > 0 ? 'var(--warn)' : 'var(--ink)' }}>{card.value}</span>
    {card.hint && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-muted)' }}>{card.hint}</span>}
  </>
)

const SummaryCards = ({ cards = [], label = 'Summary' }) => {
  if (cards.length === 0) return null
  return (
    <div role="group" aria-label={label} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, margin: '0 0 16px' }}>
      {cards.map(card => {
        const style = { ...BASE, ...(card.selected ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' } : {}) }
        if (card.to) return <Link key={card.label} to={card.to} style={style}><Body card={card} /></Link>
        if (card.onClick) return <button key={card.label} type="button" onClick={card.onClick} aria-pressed={Boolean(card.selected)} style={{ ...style, cursor: 'pointer' }}><Body card={card} /></button>
        return <div key={card.label} style={style}><Body card={card} /></div>
      })}
    </div>
  )
}

export default SummaryCards
