import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Edit3, Check, X, Plus, Trash2 } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildPoPeoHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';
import styles from '../../../styles/PoPeoAlignment.module.sass';

const MAX_PEO = 500;
const MAX_PO = 200;

const copyData = (data) => ({
  peos: data.peos.map(p => ({ statement: p.statement, missionAligned: p.missionAligned })),
  outcomes: data.outcomes.map(o => ({ id: o.id, text: o.text, peos: [...o.peos], gas: [...o.gas] }))
})

const toggle = (list, value) => (list.includes(value) ? list.filter(v => v !== value) : [...list, value].sort((a, b) => a - b))

// The program's master data, kept by its Program Head and read from the database: the program
// educational objectives (PEOs) with their relationship to the UNC mission statement, and the
// program outcomes (POs) with the PEOs and graduate attributes each supports.
const PoPeoAlignment = () => {
  const [programs, setPrograms] = useState(null)
  const [programId, setProgramId] = useState('')
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)

  useEffect(() => {
    let live = true
    fetchJson('/api/program-outcomes/programs')
      .then(result => {
        if (!live) return
        setPrograms(result.programs)
        const first = result.programs.find(program => program.outcomes > 0) || result.programs[0]
        if (first) setProgramId(String(first.id))
      })
      .catch(err => { if (live) { setPrograms([]); setError(apiErrorMessage(err, 'Could not load your programs.')) } })
    return () => { live = false }
  }, [])

  const load = useCallback(async (id) => {
    try {
      const result = await fetchJson(`/api/program-outcomes/${id}`)
      setData(result)
      setDraft(copyData(result))
      setError('')
    } catch (err) {
      setData(null)
      setError(apiErrorMessage(err, 'Could not load this program.'))
    }
  }, [])

  useEffect(() => {
    if (programId) load(programId)
  }, [programId, load])

  const rows = editing ? draft : data
  const peos = rows?.peos || []
  const outcomes = rows?.outcomes || []
  const programName = data?.program?.name || ''
  const gaLabels = data?.graduateAttributes || ['EC', 'CL', 'ERC', 'LL']

  const update = (change) => setDraft(current => change(current))

  const removePeo = (index) => update(current => ({
    peos: current.peos.filter((_, i) => i !== index),
    // Marks follow the PEO numbers: drop the removed one and shift the ones after it.
    outcomes: current.outcomes.map(o => ({ ...o, peos: o.peos.filter(n => n !== index + 1).map(n => (n > index + 1 ? n - 1 : n)) }))
  }))

  const startEdit = () => { setNotice(''); setError(''); setDraft(copyData(data)); setEditing(true) }
  const cancelEdit = () => { setDraft(copyData(data)); setEditing(false); setError('') }

  const save = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await fetchJson(`/api/program-outcomes/${programId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      })
      setData(result)
      setDraft(copyData(result))
      setEditing(false)
      setNotice('Saved. Instructors see these outcomes in their syllabus.')
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not save.'))
    } finally {
      setBusy(false)
    }
  }

  const handleView = () => {
    if (!data) return
    const logoUrl = new URL(unclogo, window.location.origin).href
    const html = buildPoPeoHtml(logoUrl, programName, outcomes.map(o => ({ text: o.text, peos: o.peos, gas: o.gas })), { peos })
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    setSelectedFile({ name: `${programName || 'Program'}_PO_PEO_Alignment.html`, file_url: url })
  }

  const markCell = (on, canToggle, onClick) => (
    <td className={`${tbl.center} ${canToggle ? tbl.clickable : ''}`} style={canToggle && on ? { background: '#DCFCE7' } : undefined} onClick={canToggle ? onClick : undefined}>
      {on ? '✔' : (canToggle ? '☐' : '')}
    </td>
  )

  const content = (
    <div className={`${pageStyles.page} ${styles.scrollPage}`}>
      <div className={pageStyles.toolbar}>
        <div className={pageStyles.titleBlock}>
          <h2>PROGRAM OUTCOMES &amp; PEO ALIGNMENT</h2>
          <p className={pageStyles.pageSubtitle}>The program&apos;s educational objectives and outcomes. Instructors use them in their syllabus.</p>
        </div>
        <label className={pageStyles.controlGroup}>
          <span className={pageStyles.controlLabel}>Program</span>
          <select className={pageStyles.courseSelect} value={programId} onChange={event => { setNotice(''); setProgramId(event.target.value) }} disabled={editing} aria-label="Select program">
            {(programs || []).map(program => <option key={program.id} value={program.id}>{program.name}</option>)}
          </select>
        </label>
        <div className={pageStyles.actions}>
          {!editing ? (
            <>
              {data?.canEdit && (
                <button type="button" className={pageStyles.secondaryButton} onClick={startEdit}>
                  <Edit3 size={16} /> Edit
                </button>
              )}
              <button type="button" className={pageStyles.primaryButton} onClick={handleView} disabled={!data}>
                <ChevronRight size={16} /> View
              </button>
            </>
          ) : (
            <>
              <button type="button" className={pageStyles.secondaryButton} onClick={cancelEdit} disabled={busy}>
                <X size={16} /> Cancel
              </button>
              <button type="button" className={pageStyles.primaryButton} onClick={save} disabled={busy}>
                <Check size={16} /> {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div role="alert" className={styles.alert}>{error}</div>}
      {notice && <div role="status" className={styles.ok}>{notice}</div>}

      {programs !== null && programs.length === 0 && !error && (
        <div className={pageStyles.contextBar}><span>No program is assigned to you yet. Ask the Dean to assign one.</span></div>
      )}

      {data && (
        <>
          <div className={pageStyles.contextBar}>
            <span><strong>Program:</strong> {programName}</span>
            <span className={pageStyles.contextMuted}>
              {editing ? 'Save or cancel these changes before switching programs.' : data.canEdit ? 'You maintain this program.' : 'View only.'}
            </span>
          </div>

          <h3 className={styles.sectionTitle}>Program Educational Objectives (PEOs) and the UNC Mission Statement</h3>
          <TableScrollRegion label="PEOs and the UNC Mission Statement" minWidth={640} className={`${pageStyles.tableRegion} ${pageStyles.compactTableRegion}`}>
            <table className={tbl.alignTable}>
              <colgroup>
                <col style={{ width: 56 }} />
                <col />
                <col style={{ width: 130 }} />
                {editing && <col style={{ width: 48 }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className={tbl.center}>#</th>
                  <th>PROGRAM EDUCATIONAL OBJECTIVES (PEOs)</th>
                  <th className={tbl.center} style={{ whiteSpace: 'normal' }}>UNC MISSION STATEMENT</th>
                  {editing && <th aria-label="Remove" />}
                </tr>
              </thead>
              <tbody>
                {peos.length === 0 && (
                  <tr><td colSpan={editing ? 4 : 3} className={styles.empty}>No PEOs yet.{data.canEdit ? ' Choose Edit to add them.' : ''}</td></tr>
                )}
                {peos.map((peo, i) => (
                  <tr key={i}>
                    <td className={tbl.center} style={{ fontWeight: 700 }}>{i + 1}</td>
                    <td>
                      {editing
                        ? <textarea className={styles.textInput} rows={2} maxLength={MAX_PEO} value={peo.statement} aria-label={`PEO ${i + 1}`}
                            onChange={event => update(c => ({ ...c, peos: c.peos.map((p, k) => (k === i ? { ...p, statement: event.target.value } : p)) }))} />
                        : peo.statement}
                    </td>
                    {markCell(peo.missionAligned, editing, () => update(c => ({ ...c, peos: c.peos.map((p, k) => (k === i ? { ...p, missionAligned: !p.missionAligned } : p)) })))}
                    {editing && (
                      <td className={tbl.center}>
                        <button type="button" className={styles.iconButton} onClick={() => removePeo(i)} title={`Remove PEO ${i + 1}`} aria-label={`Remove PEO ${i + 1}`}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollRegion>
          {editing && (
            <button type="button" className={styles.addButton} onClick={() => update(c => ({ ...c, peos: [...c.peos, { statement: '', missionAligned: true }] }))}>
              <Plus size={16} /> Add PEO
            </button>
          )}

          <h3 className={styles.sectionTitle}>Program Outcomes (POs)</h3>
          <TableScrollRegion label="Program outcomes and PEO alignment" minWidth={960} className={`${pageStyles.tableRegion} ${pageStyles.compactTableRegion}`}>
            <table className={tbl.alignTable}>
              <colgroup>
                {peos.map((_, i) => <col key={i} style={{ width: 40 }} />)}
                <col style={{ width: 56 }} />
                <col />
                {gaLabels.map(label => <col key={label} style={{ width: 48 }} />)}
                {editing && <col style={{ width: 48 }} />}
              </colgroup>
              <thead>
                <tr>
                  {peos.length > 0 && <th colSpan={peos.length} className={tbl.center}>PEOs</th>}
                  <th colSpan={2}>PROGRAM OUTCOMES (POs)</th>
                  <th colSpan={gaLabels.length} className={tbl.center}>GRADUATE ATTRIBUTES</th>
                  {editing && <th aria-label="Remove" />}
                </tr>
                <tr>
                  {peos.map((_, i) => <th key={i} className={tbl.center}>{i + 1}</th>)}
                  <th colSpan={2} style={{ fontWeight: 400 }}>
                    By the time of graduation, the students of the <strong>{programName}</strong> program shall have the ability to:
                  </th>
                  {gaLabels.map(label => <th key={label} className={tbl.center}>{label}</th>)}
                  {editing && <th />}
                </tr>
              </thead>
              <tbody>
                {outcomes.length === 0 && (
                  <tr><td colSpan={peos.length + gaLabels.length + (editing ? 3 : 2)} className={styles.empty}>No program outcomes yet.{data.canEdit ? ' Choose Edit to add them.' : ''}</td></tr>
                )}
                {outcomes.map((po, i) => (
                  <tr key={po.id ?? `new-${i}`}>
                    {peos.map((_, pi) => markCell(po.peos.includes(pi + 1), editing, () => update(c => ({ ...c, outcomes: c.outcomes.map((o, k) => (k === i ? { ...o, peos: toggle(o.peos, pi + 1) } : o)) }))))}
                    <td className={tbl.center} style={{ fontWeight: 700 }}>PO{i + 1}</td>
                    <td>
                      {editing
                        ? <textarea className={styles.textInput} rows={2} maxLength={MAX_PO} value={po.text} aria-label={`PO ${i + 1}`}
                            onChange={event => update(c => ({ ...c, outcomes: c.outcomes.map((o, k) => (k === i ? { ...o, text: event.target.value } : o)) }))} />
                        : po.text}
                    </td>
                    {gaLabels.map((label, gi) => markCell(po.gas.includes(gi + 1), editing, () => update(c => ({ ...c, outcomes: c.outcomes.map((o, k) => (k === i ? { ...o, gas: toggle(o.gas, gi + 1) } : o)) }))))}
                    {editing && (
                      <td className={tbl.center}>
                        <button type="button" className={styles.iconButton} onClick={() => update(c => ({ ...c, outcomes: c.outcomes.filter((_, k) => k !== i) }))} title={`Remove PO${i + 1}`} aria-label={`Remove PO${i + 1}`}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollRegion>
          {editing && (
            <button type="button" className={styles.addButton} onClick={() => update(c => ({ ...c, outcomes: [...c.outcomes, { text: '', peos: [], gas: [] }] }))}>
              <Plus size={16} /> Add program outcome
            </button>
          )}
        </>
      )}

      {selectedFile && (
        <PDFViewerModal
          file={selectedFile}
          kind="PO & PEO Alignment"
          onClose={() => {
            if (selectedFile.file_url?.startsWith('blob:')) URL.revokeObjectURL(selectedFile.file_url)
            setSelectedFile(null)
          }}
          onExport={(f) => {
            if (f.file_url) {
              const a = document.createElement('a');
              a.href = f.file_url;
              a.download = f.name || 'document';
              a.click();
            }
          }}
        />
      )}
    </div>
  )

  return (
    <SkeletonA
      header={<HeaderA role="Program Head" />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  )
}

export default PoPeoAlignment
