import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Trash2, X, Zap } from 'react-feather'
import useDialogFocus from '../utils/useDialogFocus.js'
import styles from '../styles/ScanReviewModal.module.sass'
import { SOURCE_LABEL } from '../utils/scanSource.js'

// "Scan · Check what was read": the scanned file on the left, what was read from it on the right, every value
// editable. Nothing is saved until "Use these" (server: utils/documentScan.js reads; the course document's
// /scanned endpoint saves).
//
//   kind     'co-po' | 'coaep'
//   file     the File that was scanned (shown as it is: a picture, or the PDF)
//   result   { data, source, warnings } from the scan
//   onUse(data) / onCancel(); busy while saving; error to show

const MARKS = ['', 'I', 'E', 'D']
const copy = (v) => JSON.parse(JSON.stringify(v))

const ScanReviewModal = ({ kind, file, result, onUse, onCancel, busy = false, error = '' }) => {
  const [data, setData] = useState(() => copy(result.data))
  const url = useMemo(() => URL.createObjectURL(file), [file])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const windowRef = useRef(null)
  useDialogFocus(windowRef, true)
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  const cos = data.cos || []
  const set = (change) => setData(d => { const next = copy(d); change(next); return next })
  const width = kind === 'co-po' ? Math.max(1, ...cos.map(c => c.poMappings.length)) : 0

  return createPortal(
    <>
      <div className={styles.backdrop} />
      <div ref={windowRef} role="dialog" aria-modal="true" aria-label="Check what was read" className={styles.window}>
        <div className="app-window-header">
          <div>
            <h2 className="app-window-title">
              <span className={styles.titleIcon}><Zap size={16} aria-hidden="true" /></span>
              Scan · Check what was read
              <span className={`${styles.badge} ${styles[result.source] || ''}`}>{SOURCE_LABEL[result.source] || 'Scanned'}</span>
            </h2>
            <div className={styles.sub}>{kind === 'coaep' ? 'COAEP' : 'CO and PO'} · {file.name}</div>
          </div>
          <div className="app-window-actions">
            <button type="button" className="app-icon-close" onClick={onCancel} disabled={busy} aria-label="Close">
              <X size={16} strokeWidth={2.5} color="currentColor" />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.preview}>
            {isPdf ? <iframe title="Scanned file" src={url} /> : <img src={url} alt="Scanned file" />}
          </div>

          <div className={styles.fields}>
            {result.warnings?.length > 0 && <div className={styles.warn}>{result.warnings.join(' ')}</div>}

            {kind === 'co-po' && (
              <>
                {cos.map((co, ci) => (
                  <section key={ci} className={styles.coBlock}>
                    <div className={styles.coHead}>
                      <strong>CO{ci + 1}</strong>
                      <button type="button" className={styles.iconBtn} aria-label={`Remove CO${ci + 1}`} onClick={() => set(d => { d.cos.splice(ci, 1) })}><Trash2 size={14} /></button>
                    </div>
                    <textarea aria-label={`Course outcome ${ci + 1}`} rows={2} value={co.description}
                      onChange={e => set(d => { d.cos[ci].description = e.target.value })} />
                    <div className={styles.marks}>
                      {Array.from({ length: width }, (_, pi) => (
                        <label key={pi} className={styles.mark}>
                          <span>PO{pi + 1}</span>
                          <select aria-label={`CO${ci + 1} PO${pi + 1}`} value={co.poMappings[pi] || ''}
                            className={co.poMappings[pi] ? styles.marked : ''}
                            onChange={e => set(d => { d.cos[ci].poMappings[pi] = e.target.value })}>
                            {MARKS.map(m => <option key={m} value={m}>{m || '—'}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
                <div className={styles.addRow}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => set(d => { d.cos.push({ description: `CO${d.cos.length + 1}: `, poMappings: Array(width).fill('') }) })}><Plus size={14} /> Course outcome</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => set(d => { d.cos.forEach(c => c.poMappings.push('')) ; if (!d.cos.length) d.cos.push({ description: 'CO1: ', poMappings: [''] }) })}><Plus size={14} /> PO column</button>
                </div>
              </>
            )}

            {kind === 'coaep' && (
              <>
                {cos.map((co, ci) => (
                  <section key={ci} className={styles.coBlock}>
                    <div className={styles.coHead}>
                      <strong>CO{ci + 1}</strong>
                      <button type="button" className={styles.iconBtn} aria-label={`Remove CO${ci + 1}`} onClick={() => set(d => { d.cos.splice(ci, 1) })}><Trash2 size={14} /></button>
                    </div>
                    <textarea aria-label={`CO${ci + 1} statement`} rows={2} value={co.statement} onChange={e => set(d => { d.cos[ci].statement = e.target.value })} />
                    {co.ilos.map((ilo, ii) => (
                      <div key={ii} className={styles.iloBlock}>
                        <div className={styles.coHead}>
                          <span>ILO{ii + 1}</span>
                          <button type="button" className={styles.iconBtn} aria-label={`Remove CO${ci + 1} ILO${ii + 1}`} onClick={() => set(d => { d.cos[ci].ilos.splice(ii, 1) })}><Trash2 size={14} /></button>
                        </div>
                        <label>Outcome<textarea rows={2} value={ilo.outcome} onChange={e => set(d => { d.cos[ci].ilos[ii].outcome = e.target.value })} /></label>
                        <label>Assessment tools <small>(separate with ;)</small>
                          <input className="app-input" value={ilo.assessments.map(a => a.name).join('; ')}
                            onChange={e => set(d => { d.cos[ci].ilos[ii].assessments = e.target.value.split(';').map(name => ({ name: name.trimStart() })) })} />
                        </label>
                        <label>Performance target<input className="app-input" value={ilo.performanceTarget} onChange={e => set(d => { d.cos[ci].ilos[ii].performanceTarget = e.target.value })} /></label>
                      </div>
                    ))}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => set(d => { d.cos[ci].ilos.push({ outcome: '', assessments: [], performanceTarget: '' }) })}><Plus size={14} /> ILO</button>
                  </section>
                ))}
                <div className={styles.addRow}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => set(d => { d.cos.push({ statement: '', ilos: [{ outcome: '', assessments: [], performanceTarget: '' }] }) })}><Plus size={14} /> Course outcome</button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.note}>{error ? <span role="alert" className={styles.error}>{error}</span> : 'Nothing is saved until you press Use these.'}</span>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={busy || !cos.length}
            onClick={() => onUse({ cos: kind === 'coaep'
              ? cos.map(c => ({ ...c, ilos: c.ilos.map(i => ({ ...i, assessments: i.assessments.map(a => ({ name: a.name.trim() })).filter(a => a.name) })) }))
              : cos })}>
            {busy ? 'Saving…' : 'Use these'}
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}

export default ScanReviewModal
