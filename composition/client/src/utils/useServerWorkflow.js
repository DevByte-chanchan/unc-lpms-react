// Loads a plan's workflow log from the server and derives its approval state.
// `reload()` re-reads it; call it after a workflow action the server accepted.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchJson } from './api.js'
import { workflowFromLogs } from './workflowFromLogs.js'

export const useServerWorkflow = (pcId, courseCode = '') => {
  const [logs, setLogs] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!pcId) { setLogs([]); return undefined }
    let live = true
    fetchJson(`/api/assignments/offering/${encodeURIComponent(pcId)}`)
      .then(data => { if (live) setLogs(data?.logs || []) })
      .catch(() => { if (live) setLogs([]) })
    return () => { live = false }
  }, [pcId, version])

  const workflow = useMemo(() => workflowFromLogs(logs || [], courseCode), [logs, courseCode])
  const reload = useCallback(() => setVersion(v => v + 1), [])
  return { workflow, loaded: logs !== null, reload }
}

export default useServerWorkflow
