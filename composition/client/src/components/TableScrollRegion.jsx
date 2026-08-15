import styles from '../styles/TableScrollRegion.module.sass'

const TableScrollRegion = ({ label, minWidth = 720, className = '', children }) => (
  <div
    className={`${styles.region} ${className}`.trim()}
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    <div className={styles.canvas} style={{ minWidth }}>
      {children}
    </div>
  </div>
)

export default TableScrollRegion
