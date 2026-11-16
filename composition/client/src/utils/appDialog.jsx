import { createRoot } from 'react-dom/client'
import AppDialog from '../components/AppDialog.jsx'

// The browser's alert() and confirm(), in the app's own window (components/AppDialog.jsx). Promise-based:
//   if (!(await confirmDialog('Remove this suggestion?', { confirmLabel: 'Remove', danger: true }))) return
//   alertDialog('The export failed: …')
const open = (props) => new Promise((resolve) => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  const onDone = (answer) => { root.unmount(); host.remove(); resolve(answer) }
  root.render(<AppDialog {...props} onDone={onDone} />)
})

// Resolves true when confirmed, false when cancelled or closed.
export const confirmDialog = (message, { title = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) =>
  open({ title, message, confirmLabel, cancelLabel, danger, tone: danger ? 'warning' : undefined })

// Closing a window that holds unsaved input: asks first (Discard / Keep editing) only when something was entered.
// Resolves true when the window may close.
export const confirmDiscard = async (dirty, message = 'What you entered in this window will be lost.') =>
  !dirty || confirmDialog(message, { title: 'Discard changes?', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true })

// A message with one OK button.
export const alertDialog = (message, { title = 'Something went wrong' } = {}) =>
  open({ title, message, confirmLabel: 'OK', cancelLabel: null, danger: false, tone: 'error' })
