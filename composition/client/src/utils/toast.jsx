import { createRoot } from 'react-dom/client'
import Toaster from '../components/Toaster.jsx'

// The app's one toast. When to use which:
//   toast('Reference archived.')                        an action finished: a toast, it closes by itself
//   toast('Opens once the Dean approves.', 'warning')   a heads-up that blocks nothing
//   alertDialog('The plan was not saved: …')            something failed: a window to read (utils/appDialog.jsx)
//   confirmDialog('Delete …?', { danger: true })        something that cannot be undone: ask first
// Failures never go in a toast; one that disappears before it is read loses the person's work silently.
let push = null
const waiting = []
let nextId = 0
let mounted = false

const connect = (fn) => {
  push = fn
  waiting.splice(0).forEach(fn)
  return () => { push = null }
}

// type: 'success' (default), 'warning' or 'info'. An 'error' is shown as a warning; failures belong in alertDialog.
export const toast = (message, type = 'success') => {
  if (!message) return
  if (!mounted) {
    mounted = true
    const host = document.createElement('div')
    document.body.appendChild(host)
    createRoot(host).render(<Toaster connect={connect} />)
  }
  const item = { id: ++nextId, message: String(message), type: type === 'error' ? 'warning' : type }
  if (push) push(item)
  else waiting.push(item)
}

export default toast
