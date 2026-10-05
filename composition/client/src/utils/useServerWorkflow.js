// Loads a plan's workflow log from the server and derives its approval state.
// `reload()` re-reads it; call it after a workflow action the server accepted.
//
// `error` is set when there is no offering to ask about, or the log cannot be read, so a
// screen can say so. A plan whose status is unknown must never be shown as a draft.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchJson, apiErrorMessage } from './api.js'
import { workflowFromLogs } from './workflowFromLogs.js'

export const MISSING_OFFERING_MESSAGE =
  'This page was opened without its course offering (pcId), so the approval status cannot be loaded. Open the course from the course list instead.'

export const useServerWorkflow = (pcId, courseCode = '') => {
  const [logs, setLogs] = useState(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!pcId) { setLogs([]); setError(MISSING_OFFERING_MESSAGE); return undefined }
    let live = true
    fetchJson(`/api/assignments/offering/${encodeURIComponent(pcId)}`)
      .then(data => { if (live) { setLogs(data?.logs || []); setError('') } })
      .catch(err => {
        if (live) { setLogs([]); setError(`The approval status could not be loaded: ${apiErrorMessage(err, 'request failed')}`) }
      })
    return () => { live = false }
  }, [pcId, version])

  const workflow = useMemo(() => workflowFromLogs(logs || [], courseCode), [logs, courseCode])
  const reload = useCallback(() => setVersion(v => v + 1), [])
  return { workflow, loaded: logs !== null, error, reload }
}

export default useServerWorkflow
