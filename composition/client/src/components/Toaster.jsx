import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Info, X } from 'react-feather'
import styles from '../styles/Toast.module.sass'

// The stack of toasts in the bottom-right corner. Mounted once by utils/toast.jsx, which hands it `connect`: the
// stack registers its push function there and receives anything sent before it was ready.
const ICONS = { success: CheckCircle, warning: AlertTriangle, info: Info }
const SHOWN_FOR = { success: 3500, info: 4000, warning: 5500 }
const MAX = 3

const Toaster = ({ connect }) => {
  const [items, setItems] = useState([])
  useEffect(() => {
    const dismiss = (id) => setItems(list => list.filter(item => item.id !== id))
    return connect((item) => {
      setItems(list => [...list.slice(1 - MAX), item])
      window.setTimeout(() => dismiss(item.id), SHOWN_FOR[item.type] || SHOWN_FOR.info)
    })
  }, [connect])
  const close = (id) => setItems(list => list.filter(item => item.id !== id))
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {items.map(({ id, message, type }) => {
        const Icon = ICONS[type] || Info
        return (
          <div key={id} className={`${styles.toast} ${styles[type] || styles.info}`}>
            <Icon size={18} className={styles.icon} aria-hidden="true" />
            <span className={styles.message}>{message}</span>
            <button type="button" className={styles.close} aria-label="Dismiss" onClick={() => close(id)}><X size={14} /></button>
          </div>
        )
      })}
    </div>
  )
}

export default Toaster
