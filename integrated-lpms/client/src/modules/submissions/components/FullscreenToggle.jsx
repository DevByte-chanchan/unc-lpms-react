import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Maximize, Minimize2 } from 'lucide-react'

// Full screen for any page: the page takes the whole window (the top bar steps aside, the side bar stays: index.css,
// body[data-focus]) and, where the browser allows it, the browser's own full screen too. Works the same on a small
// laptop, a zoomed browser or one without the Fullscreen API (then only the bars step aside). While it is on, a small
// "Exit full screen" tab shows at the top for a moment, then tucks away so it covers nothing; moving the pointer to
// the top edge (or Tab) brings it back. Esc also leaves (the browser's own Esc is followed).
const isOn = () => document.body.dataset.focus === '1'

const FullscreenToggle = ({ className = '' }) => {
  const [on, setOn] = useState(isOn)

  const leave = useCallback(() => {
    delete document.body.dataset.focus
    setOn(false)
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {})
  }, [])

  const enter = useCallback(() => {
    document.body.dataset.focus = '1'
    setOn(true)
    const root = document.documentElement
    if (!document.fullscreenElement && root.requestFullscreen) root.requestFullscreen().catch(() => { /* bars-only mode */ })
  }, [])

  useEffect(() => {
    // the browser left its full screen (its own Esc or F11): leave ours too
    const onChange = () => { if (!document.fullscreenElement && isOn()) leave() }
    // without the browser's full screen, Esc leaves ours (unless a window or menu takes it first)
    const onKey = (event) => { if (event.key === 'Escape' && isOn() && !document.fullscreenElement && !document.querySelector('[role=dialog],[role=alertdialog],[role=menu],[role=listbox]')) leave() }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('keydown', onKey) }
  }, [leave])

  return (
    <>
      <button type="button" className={className || 'app-icon-btn'} onClick={on ? leave : enter}
        title={on ? 'Exit full screen' : 'Full screen'} aria-label={on ? 'Exit full screen' : 'Full screen'} aria-pressed={on}>
        {on ? <Minimize2 size={16} /> : <Maximize size={16} />}
      </button>
      {on && createPortal(
        // a thin hover strip along the top edge holds the tab; the tab peeks out for 3 s, then hides above the edge
        <div className="app-focus-exit-zone">
          <button type="button" className="app-focus-exit" onClick={leave} title="Exit full screen (Esc)">
            <Minimize2 size={14} aria-hidden="true" /> Exit full screen <kbd>Esc</kbd>
          </button>
        </div>,
        document.body
      )}
    </>
  )
}

export default FullscreenToggle
