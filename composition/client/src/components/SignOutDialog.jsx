import { useEffect, useId, useRef } from 'react'
import styles from '../styles/SignOutDialog.module.sass'

const SignOutDialog = ({ open, onConfirm, onCancel }) => {
  const titleId = useId()
  const descriptionId = useId()
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancelRef.current?.focus()

    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', dismissOnEscape)

    return () => {
      document.removeEventListener('keydown', dismissOnEscape)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <h2 id={titleId}>Sign out?</h2>
        <p id={descriptionId}>Are you sure you want to sign out of the Learning Plan System?</p>
        <div className={styles.actions}>
          <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>Sign out</button>
        </div>
      </div>
    </div>
  )
}

export default SignOutDialog
