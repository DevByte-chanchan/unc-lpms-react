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
  open({ title, message, confirmLabel, cancelLabel, danger })

// A message with one OK button.
export const alertDialog = (message, { title = 'Something went wrong' } = {}) =>
  open({ title, message, confirmLabel: 'OK', cancelLabel: null, danger: false })
