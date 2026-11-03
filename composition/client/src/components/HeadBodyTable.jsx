import { useCallback, useLayoutEffect, useRef } from 'react'
import styles from '../styles/HeadBodyTable.module.sass'

// A wide table whose header stays put and whose rows scroll on their own: two tables with the same fixed column
// widths, the header one above the scrolling body one. The up-and-down scrollbar therefore starts under the header,
// the sideways one sits at the bottom of the rows, and the header follows the sideways scroll.
//
//   widths   the column widths in px (their sum is the narrowest the table gets)
//   head     the header row: <tr><th>…</th></tr>
//   children the body rows: <tbody>…</tbody>
const HeadBodyTable = ({ label, widths, head, children, tableClass = '', className = '' }) => {
  const headRef = useRef(null)
  const bodyRef = useRef(null)
  const total = widths.reduce((sum, width) => sum + width, 0)

  // The header leaves room for the body's scrollbar, so both tables lay out at the same width.
  const sync = useCallback(() => {
    const body = bodyRef.current
    const header = headRef.current
    if (!body || !header) return
    header.style.paddingRight = `${body.offsetWidth - body.clientWidth}px`
    header.scrollLeft = body.scrollLeft
  }, [])

  useLayoutEffect(() => {
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(bodyRef.current)
    return () => observer.disconnect()
  }, [sync])

  const tableStyle = { width: '100%', minWidth: total, tableLayout: 'fixed' }
  const cols = <colgroup>{widths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup>

  return (
    <div className={`${styles.shell} ${className}`.trim()} role="region" aria-label={label}>
      <div ref={headRef} className={styles.head}>
        <table className={tableClass} style={tableStyle}>{cols}<thead>{head}</thead></table>
      </div>
      <div ref={bodyRef} className={styles.body} tabIndex={0} onScroll={sync}>
        <table className={tableClass} style={tableStyle}>{cols}{children}</table>
      </div>
    </div>
  )
}

export default HeadBodyTable
