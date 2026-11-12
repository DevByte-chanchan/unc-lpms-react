import Select from '../../../components/Select.jsx'
import { useState, useEffect, useCallback, useRef } from 'react';
import { Edit3, Check, X, Plus, Trash2, Upload, Zap, Download, FileText } from 'react-feather';
import { SOURCE_LABEL } from '../../../utils/scanSource.js';
import { DocumentBar, TemplateButton } from '../../../components/CourseDocumentBar.jsx';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import PdfViewer from '../../../components/PdfViewer.jsx';
import { buildPoPeoHtml } from '../../../utils/syllabusPdfHtml.js';
import { fetchJson, apiErrorMessage } from '../../../utils/api.js';
import { fetchFrontPages, countPdfPages } from '../../../utils/frontPages.js';
import unclogo from '../../../assets/unclogo.png';
import cc from '../../../styles/SyllabusPreview.module.sass';
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
// `tabs`: shown as the page header when this page is a tab of Outcomes Alignment.
// `view`: 'front' for the Front pages tab (the uploaded first three syllabus pages), else the PO / PEO tables.
const PoPeoAlignment = ({ tabs = null, view = 'outcomes' }) => {
  const frontView = view === 'front'
  const [programs, setPrograms] = useState(null)
  const [programId, setProgramId] = useState('')
  const [data, setData] = useState(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  // The program's uploaded front pages (first three syllabus pages): { pages } or null; undefined while loading.
  const [front, setFront] = useState(undefined)
  const importRef = useRef(null)
  const scanRef = useRef(null)
  const frontRef = useRef(null)
  // The front pages read and checked against this program's PEOs and POs (null until checked)
  const [frontCheck, setFrontCheck] = useState(null)

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

  const loadFront = useCallback(async (id) => {
    setFront(undefined)
    try {
      const bytes = await fetchFrontPages(id)
      setFront(bytes ? { bytes, pages: await countPdfPages(bytes) } : null)
    } catch {
      setFront(null)
    }
  }, [])
  useEffect(() => { if (programId) loadFront(programId) }, [programId, loadFront])

  // A file as raw bytes to one of the program's document endpoints (controllers/programDocumentsController.js).
  const sendFile = (path, method, file) => fetchJson(`/api/program-outcomes/${programId}/${path}`, {
    method, headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file,
  })

  const uploadFront = async (file) => {
    if (!file) return
    setBusy(true); setError(''); setNotice('')
    try {
      const pages = await countPdfPages(await file.arrayBuffer()).catch(() => 0)
      if (!pages) throw new Error('This file is not a readable PDF.')
      await sendFile('front-pages', 'PUT', file)
      setNotice(`Front pages uploaded (${pages} page${pages === 1 ? '' : 's'}).`)
      await loadFront(programId)
    } catch (err) {
      setError(apiErrorMessage(err, err?.message || 'The front pages were not uploaded.'))
    } finally {
      setBusy(false)
      if (frontRef.current) frontRef.current.value = ''
    }
  }

  const removeFront = async () => {
    if (!window.confirm(`Remove the uploaded front pages of ${programName}? Exports go back to the generated pages.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      await fetchJson(`/api/program-outcomes/${programId}/front-pages`, { method: 'DELETE' })
      setNotice('Front pages removed.')
      await loadFront(programId)
    } catch (err) {
      setError(apiErrorMessage(err, 'The front pages were not removed.'))
    } finally {
      setBusy(false)
    }
  }

  const viewFront = () => {
    if (!front?.bytes) return
    window.open(URL.createObjectURL(new Blob([front.bytes], { type: 'application/pdf' })), '_blank', 'noopener')
  }

  // The PO / PEO spreadsheet goes into the editor, not straight into the database: check it, then Save.
  const importSheet = async (file) => {
    if (!file) return
    // A PDF has no spreadsheet to import: it is read like a scan (its text exactly) into the same editor.
    if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
      if (importRef.current) importRef.current.value = ''
      return scanSheets([file])
    }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await sendFile('import', 'POST', file)
      setDraft({
        peos: result.peos,
        // Existing outcomes keep their ids by position, so course alignments to PO1, PO2... stay attached.
        outcomes: result.outcomes.map((o, i) => ({ id: data?.outcomes?.[i]?.id ?? null, text: o.text, peos: o.peos, gas: o.gas })),
      })
      setEditing(true)
      setNotice(`Read ${result.peos.length} PEOs, ${result.outcomes.length} POs. Check, then Save.`)
    } catch (err) {
      setError(apiErrorMessage(err, 'The spreadsheet could not be read.'))
    } finally {
      setBusy(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  // Scan photos or PDFs of the PEO / PO tables (one page per photo is fine): what is read goes into the editor,
  // like the spreadsheet import. Pages are read in order; PEOs and POs found on any of them are kept, once each.
  const scanSheets = async (fileList) => {
    const files = Array.from(fileList || [])
    if (!files.length) return
    setBusy(true); setError(''); setNotice('')
    try {
      const seen = (list, key, text) => list.some(x => x[key].toLowerCase().replace(/[^a-z0-9]/g, '') === text.toLowerCase().replace(/[^a-z0-9]/g, ''))
      const peosRead = []
      const outcomesRead = []
      const sources = new Set()
      const warnings = new Set()
      for (const file of files) {
        const result = await fetchJson(`/api/program-outcomes/${programId}/scan`, {
          method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file,
        })
        sources.add(SOURCE_LABEL[result.source] || 'Scanned')
        ;(result.warnings || []).forEach(w => warnings.add(w))
        result.peos.forEach(p => { if (!seen(peosRead, 'statement', p.statement)) peosRead.push(p) })
        result.outcomes.forEach(o => { if (!seen(outcomesRead, 'text', o.text)) outcomesRead.push(o) })
      }
      const current = data || { peos: [], outcomes: [] }
      const peosNext = peosRead.length ? peosRead : current.peos
      setDraft({
        peos: peosNext,
        // Existing outcomes keep their ids by position, so course alignments to PO1, PO2... stay attached; a page
        // with only PEOs (or only POs) leaves the other table as it was.
        outcomes: (outcomesRead.length ? outcomesRead : current.outcomes).map((o, i) => ({
          id: current.outcomes?.[i]?.id ?? null, text: o.text,
          peos: (o.peos || []).filter(n => n <= peosNext.length), gas: o.gas || [],
        })),
      })
      setEditing(true)
      setNotice(`${[...sources].join(', ')}: ${peosRead.length} PEOs, ${outcomesRead.length} POs. ${[...warnings].join(' ')} Check, then Save.`.replace(/\s+/g, ' '))
    } catch (err) {
      setError(apiErrorMessage(err, 'The file could not be scanned.'))
    } finally {
      setBusy(false)
      if (scanRef.current) scanRef.current.value = ''
    }
  }

  // Read the uploaded front pages and say whether this program's vision, mission, PEOs and POs are in them.
  const checkFront = async () => {
    setBusy(true); setError(''); setNotice(''); setFrontCheck(null)
    try {
      setFrontCheck(await fetchJson(`/api/program-outcomes/${programId}/front-pages/check`, { method: 'POST' }))
    } catch (err) {
      setError(apiErrorMessage(err, 'The front pages could not be read.'))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => { setFrontCheck(null) }, [programId, front])

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
      setNotice('Saved.')
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

  const markCell = (on, canToggle, onClick, key) => (
    <td key={key} className={`${cc.mappingCell} ${canToggle ? tbl.clickable : ''}`} onClick={canToggle ? onClick : undefined}>
      {on ? '✔' : (canToggle ? '☐' : '')}
    </td>
  )

  const content = (
    <div className={`${pageStyles.page} ${pageStyles.flowPage}`}>
      <div className={pageStyles.pageHeader}>
        {tabs || <h2 className="app-page-title">Program Outcomes &amp; PEO Alignment</h2>}
        {!frontView && <div className={pageStyles.pageHeaderActions}>
          {!editing ? (
            <>
              {data?.canEdit && (
                <button type="button" className="btn btn-secondary" onClick={startEdit}>
                  <Edit3 size={16} /> Edit
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={handleView} disabled={!data}>
                <Download size={16} /> Export
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={cancelEdit} disabled={busy}>
                <X size={16} /> Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
                <Check size={16} /> {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>}
      </div>

      <div className={pageStyles.toolbarControls}>
        <Select variant="pill" prefix="Program:" value={programId} onChange={event => { setNotice(''); setProgramId(event.target.value) }} disabled={editing} aria-label="Select program">
            {(programs || []).map(program => <option key={program.id} value={program.id}>{program.name}</option>)}
          </Select>
      </div>

      {data && !frontView && data.canEdit && (
        <DocumentBar label="Import" status={editing ? 'check, then Save.' : 'Excel or PDF fills the tables below.'}>
          <TemplateButton path="/api/program-outcomes/template.xlsx" name="PO-PEO-template.xlsx" onError={setError} />
          <input ref={importRef} type="file" accept=".xlsx,.xls,.pdf,application/pdf" hidden aria-label="PO and PEO spreadsheet" onChange={e => importSheet(e.target.files?.[0])} />
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => importRef.current?.click()} disabled={busy || editing}>
            <Upload size={14} /> Upload Excel or PDF
          </button>
          <input ref={scanRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" multiple hidden aria-label="Scan PO and PEO pages" onChange={e => scanSheets(e.target.files)} />
          <button type="button" className="btn btn-secondary btn-sm" title="Read photos or a PDF of the PEO / PO tables, then check them" onClick={() => scanRef.current?.click()} disabled={busy || editing}>
            <Zap size={14} /> {busy ? 'Reading…' : 'Scan'}
          </button>
          {/* The uploaded front pages already hold the PEO and PO tables: read them the same way, no second upload. */}
          {front?.bytes && (
            <button type="button" className="btn btn-secondary btn-sm" title="Read the PEOs, POs and their ticks from the uploaded front pages, then check them"
              onClick={() => scanSheets([new File([front.bytes], `${programName || 'Program'} front pages.pdf`, { type: 'application/pdf' })])} disabled={busy || editing}>
              <FileText size={14} /> From front pages
            </button>
          )}
        </DocumentBar>
      )}

      {data && frontView && (
        <DocumentBar label="Front pages" status={
          front === undefined ? 'checking…' : front ? `${front.pages}-page PDF, added to exports.` : 'none, generated pages are used.'
        }>
          {front && <button type="button" className="btn btn-secondary btn-sm" onClick={viewFront}>View</button>}
          {data.canEdit && (
            <>
              <input ref={frontRef} type="file" accept="application/pdf,.pdf" hidden aria-label="Front pages PDF" onChange={e => uploadFront(e.target.files?.[0])} />
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy || editing} onClick={() => frontRef.current?.click()}>
                <Upload size={14} /> {busy ? 'Checking…' : front ? 'Replace PDF' : 'Upload PDF'}
              </button>
              {front && <button type="button" className="btn btn-secondary btn-sm" disabled={busy || editing} title="Read the front pages and check them against this program's PEOs and POs" onClick={checkFront}>
                <Zap size={14} /> {busy ? 'Reading…' : 'Check'}
              </button>}
              {front && <button type="button" className="btn btn-danger-outline btn-sm" disabled={busy || editing} onClick={removeFront}>Remove</button>}
            </>
          )}
        </DocumentBar>
      )}

      {frontView && frontCheck && (() => {
        const missing = [
          !frontCheck.vision && 'the vision statement',
          !frontCheck.mission && 'the mission statement',
          ...frontCheck.peos.filter(x => !x.found).map(x => x.label),
          ...frontCheck.outcomes.filter(x => !x.found).map(x => x.label),
        ].filter(Boolean)
        const found = frontCheck.peos.filter(x => x.found).length + frontCheck.outcomes.filter(x => x.found).length
        return (
          <div role="status" className={missing.length ? styles.alert : styles.ok}>
            {SOURCE_LABEL[frontCheck.source] || 'Read'}: {found} of {frontCheck.peos.length + frontCheck.outcomes.length} found.
            {missing.length ? ` Missing: ${missing.join(', ')}.` : ' All match.'}
          </div>
        )
      })()}

      {/* Ready for learning plans? Courses of this program cannot be assigned until it is (server: utils/programReadiness.js). */}
      {data?.readiness && (
        <div role="status" className={data.readiness.complete ? styles.ok : styles.alert}>
          {data.readiness.complete
            ? `Ready: ${data.readiness.pos} POs, ${data.readiness.peos} PEOs.`
            : `Not ready, courses can't be assigned. Missing: ${data.readiness.missing.join('; ')}.`}
        </div>
      )}
      {error && <div role="alert" className={styles.alert}>{error}</div>}
      {notice && <div role="status" className={styles.ok}>{notice}</div>}

      {programs !== null && programs.length === 0 && !error && (
        <div className={pageStyles.contextBar}><span>No program is assigned to you yet. Ask the Dean to assign one.</span></div>
      )}

      {frontView && front?.bytes && <PdfViewer bytes={front.bytes} fileName={`${programName || 'Program'} front pages.pdf`} kind="Front pages" title={programName} detail="University, Program and PEOs, POs and PEOs" />}

      {data && !frontView && (
        <>
          {editing && <p className={pageStyles.contextLine}>Save or cancel these changes before switching programs.</p>}

          <h3 className={styles.sectionTitle}>Program educational objectives (PEOs) and the UNC mission statement</h3>
          <div style={{ minWidth: 0 }}><TableScrollRegion label="PEOs and the UNC Mission Statement" minWidth={640} className={`${cc.tableScrollWrapper} ${tbl.plainWrap} ${pageStyles.flowTable}`}>
            <table className={`${cc.alignmentTable} ${tbl.plain}`}>
              <colgroup>
                <col style={{ width: 56 }} />
                <col />
                <col style={{ width: 130 }} />
                {editing && <col style={{ width: 56 }} />}
              </colgroup>
              <thead>
                <tr>
                  <th className={cc.poHeader}>#</th>
                  <th className={cc.firstColHeader}>PROGRAM EDUCATIONAL OBJECTIVES (PEOs)</th>
                  <th className={cc.poHeader} style={{ whiteSpace: 'normal', width: 130 }}>UNC MISSION STATEMENT</th>
                  {editing && <th className={cc.poHeader} aria-label="Remove" style={{ width: 56, minWidth: 56, maxWidth: 56, padding: 0 }} />}
                </tr>
              </thead>
              <tbody>
                {peos.length === 0 && (
                  <tr><td colSpan={editing ? 4 : 3} className={styles.empty}>No PEOs yet.{data.canEdit ? ' Choose Edit to add them.' : ''}</td></tr>
                )}
                {peos.map((peo, i) => (
                  <tr key={i}>
                    <td className={cc.mappingCell}>{i + 1}</td>
                    <td className={cc.descCell}>
                      {editing
                        ? <textarea className={styles.textInput} rows={2} maxLength={MAX_PEO} value={peo.statement} aria-label={`PEO ${i + 1}`}
                            onChange={event => update(c => ({ ...c, peos: c.peos.map((p, k) => (k === i ? { ...p, statement: event.target.value } : p)) }))} />
                        : peo.statement}
                    </td>
                    {markCell(peo.missionAligned, editing, () => update(c => ({ ...c, peos: c.peos.map((p, k) => (k === i ? { ...p, missionAligned: !p.missionAligned } : p)) })))}
                    {editing && (
                      <td className={cc.mappingCell} style={{ width: 56, minWidth: 56, maxWidth: 56, padding: 0 }}>
                        <button type="button" className={styles.iconButton} onClick={() => removePeo(i)} title={`Remove PEO ${i + 1}`} aria-label={`Remove PEO ${i + 1}`}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollRegion></div>
          {editing && (
            <button type="button" className={styles.addButton} onClick={() => update(c => ({ ...c, peos: [...c.peos, { statement: '', missionAligned: false }] }))}>
              <Plus size={16} /> Add PEO
            </button>
          )}

          <h3 className={styles.sectionTitle}>Program outcomes (POs)</h3>
          <div style={{ minWidth: 0 }}><TableScrollRegion label="Program outcomes and PEO alignment" minWidth={960} className={`${cc.tableScrollWrapper} ${tbl.plainWrap} ${pageStyles.flowTable}`}>
            <table className={`${cc.alignmentTable} ${tbl.plain}`}>
              <colgroup>
                {peos.map((_, i) => <col key={i} style={{ width: 40 }} />)}
                <col style={{ width: 56 }} />
                <col />
                {gaLabels.map(label => <col key={label} style={{ width: 48 }} />)}
                {editing && <col style={{ width: 56 }} />}
              </colgroup>
              <thead>
                <tr>
                  {peos.length > 0 && <th colSpan={peos.length} className={cc.poHeader}>PEOs</th>}
                  <th colSpan={2} className={cc.firstColHeader}>PROGRAM OUTCOMES (POs)</th>
                  <th colSpan={gaLabels.length} className={cc.poHeader}>GRADUATE ATTRIBUTES</th>
                  {editing && <th className={cc.poHeader} aria-label="Remove" style={{ width: 56, minWidth: 56, maxWidth: 56, padding: 0 }} />}
                </tr>
                <tr>
                  {peos.map((_, i) => <th key={i} className={cc.poHeader}>{i + 1}</th>)}
                  <th colSpan={2} className={cc.firstColHeader} style={{ fontWeight: 400 }}>
                    By the time of graduation, the students of the <strong>{programName}</strong> program shall have the ability to:
                  </th>
                  {gaLabels.map(label => <th key={label} className={cc.poHeader}>{label}</th>)}
                  {editing && <th className={cc.poHeader} style={{ width: 56, minWidth: 56, maxWidth: 56, padding: 0 }} />}
                </tr>
              </thead>
              <tbody>
                {outcomes.length === 0 && (
                  <tr><td colSpan={peos.length + gaLabels.length + (editing ? 3 : 2)} className={styles.empty}>No program outcomes yet.{data.canEdit ? ' Choose Edit to add them.' : ''}</td></tr>
                )}
                {outcomes.map((po, i) => (
                  <tr key={po.id ?? `new-${i}`}>
                    {peos.map((_, pi) => markCell(po.peos.includes(pi + 1), editing, () => update(c => ({ ...c, outcomes: c.outcomes.map((o, k) => (k === i ? { ...o, peos: toggle(o.peos, pi + 1) } : o)) })), `peo-${pi}`))}
                    <td className={cc.mappingCell}>PO{i + 1}</td>
                    <td className={cc.descCell}>
                      {editing
                        ? <textarea className={styles.textInput} rows={2} maxLength={MAX_PO} value={po.text} aria-label={`PO ${i + 1}`}
                            onChange={event => update(c => ({ ...c, outcomes: c.outcomes.map((o, k) => (k === i ? { ...o, text: event.target.value } : o)) }))} />
                        : po.text}
                    </td>
                    {gaLabels.map((label, gi) => markCell(po.gas.includes(gi + 1), editing, () => update(c => ({ ...c, outcomes: c.outcomes.map((o, k) => (k === i ? { ...o, gas: toggle(o.gas, gi + 1) } : o)) })), `ga-${gi}`))}
                    {editing && (
                      <td className={cc.mappingCell} style={{ width: 56, minWidth: 56, maxWidth: 56, padding: 0 }}>
                        <button type="button" className={styles.iconButton} onClick={() => update(c => ({ ...c, outcomes: c.outcomes.filter((_, k) => k !== i) }))} title={`Remove PO${i + 1}`} aria-label={`Remove PO${i + 1}`}><Trash2 size={16} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollRegion></div>
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
