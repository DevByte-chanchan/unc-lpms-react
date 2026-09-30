import { useCallback, useLayoutEffect, useRef } from 'react'
import styles from '../styles/TableScrollRegion.module.sass'

const TableScrollRegion = ({ label, minWidth = 720, className = '', children }) => {
  const regionRef = useRef(null)

  const syncViewport = useCallback((node = regionRef.current) => {
    if (!node) return
    node.style.setProperty('--table-scroll-left', `${node.scrollLeft}px`)
    node.style.setProperty('--table-viewport-width', `${node.clientWidth}px`)
  }, [])

  useLayoutEffect(() => {
    const node = regionRef.current
    if (!node) return undefined

    syncViewport(node)
    const observer = new ResizeObserver(() => syncViewport(node))
    observer.observe(node)
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
      onScroll={(event) => syncViewport(event.currentTarget)}
    >
      <div className={styles.canvas} style={{ minWidth }}>
        {children}
      </div>
    </div>
  )
}

export default TableScrollRegion
