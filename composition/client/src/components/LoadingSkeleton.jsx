import styles from '../styles/LoadingSkeleton.module.sass'

// Grey placeholder shapes shown while something loads, in the size and place of what will replace them, so the page
// does not jump when the data arrives and the wait feels shorter than a spinner on a blank screen. They are hidden
// from screen readers; the wrapper that uses them says what is loading.

// One shape: a line, a block or a circle (`round`).
export const Bone = ({ w = '100%', h = 14, round = false, style }) => (
  <span className={styles.bone} aria-hidden="true"
    style={{ width: w, height: h, borderRadius: round ? '50%' : 6, ...style }} />
)

// Wraps skeleton shapes with what is loading, said once for screen readers.
export const Loading = ({ label = 'Loading…', children }) => (
  <div role="status" aria-live="polite" style={{ width: '100%' }}>
    <span className={styles.srOnly}>{label}</span>
    {children}
  </div>
)

// A few lines of text, the last one shorter.
export const BlockSkeleton = ({ rows = 5 }) => (
  <div className={styles.block} aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => <Bone key={i} h={14} w={i === rows - 1 ? '60%' : '100%'} />)}
  </div>
)

// A table: a header band and rows. `cols` are the column widths (px numbers, or a CSS width such as '1fr').
export const TableSkeleton = ({ rows = 6, cols = [200, 150, '1fr', 190, 210], rowHeight = 64 }) => {
  const template = cols.map(col => (typeof col === 'number' ? `${col}px` : col)).join(' ')
  return (
    <div className={styles.table} aria-hidden="true">
      <div className={styles.head} style={{ gridTemplateColumns: template }}>
        {cols.map((_, i) => <Bone key={i} h={12} w="55%" />)}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={styles.row} style={{ gridTemplateColumns: template, minHeight: rowHeight }}>
          {cols.map((_, i) => <Bone key={i} h={14} w={i === 0 ? '70%' : i === cols.length - 1 ? '50%' : '80%'} />)}
        </div>
      ))}
    </div>
  )
}

// The whole screen while a page is loaded: the sidebar, the top bar and a title with a table, laid out like the real
// ones, so opening a page shows its frame at once.
export const PageSkeleton = () => (
  <div className={styles.page} role="status" aria-live="polite">
    <span className={styles.srOnly}>Loading page…</span>
    <aside className={styles.side} aria-hidden="true">
      <div className={styles.brand}><Bone w={36} h={36} round /><Bone w="55%" h={14} /></div>
      <Bone h={36} />
      <div className={styles.nav}>{Array.from({ length: 6 }, (_, i) => <Bone key={i} h={36} />)}</div>
    </aside>
    <div className={styles.main}>
      <div className={styles.top} aria-hidden="true"><Bone w={140} h={12} /></div>
      <div className={styles.content} aria-hidden="true">
        <Bone w={260} h={26} />
        <div className={styles.tools}><Bone w={320} h={36} /><Bone w={130} h={36} /><Bone w={110} h={36} /></div>
        <TableSkeleton rows={6} />
      </div>
    </div>
  </div>
)

export default Bone
