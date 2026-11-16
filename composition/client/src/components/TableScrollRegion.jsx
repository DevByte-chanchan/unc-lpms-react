import { useCallback, useLayoutEffect, useRef } from 'react'
import styles from '../styles/TableScrollRegion.module.sass'

const TableScrollRegion = ({ label, minWidth = 720, className = '', children }) => {
  const regionRef = useRef(null)

  // The visible width, for a centred empty-state row (EmptyState.module.sass). Only on resize: writing a style on
  // the scroller while it scrolls restyles it mid-drag, and Chromium then drops its scrollbar thumb.
  const syncViewport = useCallback((node = regionRef.current) => {
    if (!node) return
    node.style.setProperty('--table-viewport-width', `${node.clientWidth}px`)
    // The right-edge fade would also fade a vertical scrollbar, so a region that scrolls both ways goes without it.
    node.dataset.scrollsY = String(node.scrollHeight > node.clientHeight + 1)
  }, [])

  useLayoutEffect(() => {
    const node = regionRef.current
    if (!node) return undefined

    syncViewport(node)
    const observer = new ResizeObserver(() => syncViewport(node))
    observer.observe(node)
    // the table growing (rows loading) does not resize a capped region, so watch the canvas too
    if (node.firstElementChild) observer.observe(node.firstElementChild)
    return () => observer.disconnect()
  }, [syncViewport])

  return (
    <div
      ref={regionRef}
      className={`${styles.region} ${className}`.trim()}
      data-table-region="true"
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      <div className={styles.canvas} style={{ minWidth }}>
        {children}
      </div>
    </div>
  )
}

export default TableScrollRegion
