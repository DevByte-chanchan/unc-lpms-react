import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, Edit3, Check, X } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildPoPeoHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getPoPeoData, savePoPeoData } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';
import TableScrollRegion from '../../../components/TableScrollRegion.jsx';
import pageStyles from '../../../styles/ProgramHeadWorkspace.module.sass';

const GAS_LABELS = ['EC', 'CL', 'ERC', 'LL']

const PoPeoAlignment = () => {
  const [programCode, setProgramCode] = useState('')
  const [data, setData] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editRows, setEditRows] = useState([])

  const programs = useMemo(() => getAllPrograms(), [])

  useEffect(() => {
    if (!programCode && programs.length > 0) setProgramCode(programs[0])
  }, [programs, programCode])

  useEffect(() => {
    if (programCode) {
      const d = getPoPeoData(programCode)
      setData(d)
      setEditRows(d.programOutcomes.map(po => ({ ...po, peos: [...po.peos], gas: [...po.gas] })))
    }
  }, [programCode])

  const handleView = () => {
    if (!data) return
    const logoUrl = new URL(unclogo, window.location.origin).href
    const html = buildPoPeoHtml(logoUrl, programCode, editRows)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setSelectedFile({ name: `${programCode}_PO_PEO_Alignment.html`, file_url: url })
  }

  const togglePeo = (rowIdx, peoIdx) => {
    const next = editRows.map(r => ({ ...r }))
    const arr = next[rowIdx].peos
    const idx = arr.indexOf(peoIdx + 1)
    if (idx === -1) next[rowIdx].peos = [...arr, peoIdx + 1].sort()
    else next[rowIdx].peos = arr.filter(v => v !== peoIdx + 1)
    setEditRows(next)
  }

  const toggleGas = (rowIdx, gasIdx) => {
    const next = editRows.map(r => ({ ...r }))
    const arr = next[rowIdx].gas
    const idx = arr.indexOf(gasIdx + 1)
    if (idx === -1) next[rowIdx].gas = [...arr, gasIdx + 1].sort()
    else next[rowIdx].gas = arr.filter(v => v !== gasIdx + 1)
    setEditRows(next)
  }

  const handleSave = () => {
    savePoPeoData(programCode, { programOutcomes: editRows, gasLabels: GAS_LABELS })
    setData({ programOutcomes: editRows.map(r => ({ ...r, peos: [...r.peos], gas: [...r.gas] })) })
    setEditing(false)
  }

  const handleCancel = () => {
    if (data) setEditRows(data.programOutcomes.map(po => ({ ...po, peos: [...po.peos], gas: [...po.gas] })))
    setEditing(false)
  }

  const content = (
    <div className={pageStyles.page}>
      <div className={pageStyles.toolbar}>
        <div className={pageStyles.titleBlock}>
          <h2>PROGRAM OUTCOMES &amp; PEO ALIGNMENT</h2>
          <p className={pageStyles.pageSubtitle}>Review and maintain Program Outcome mappings for the selected program.</p>
        </div>
        <label className={pageStyles.controlGroup}>
          <span className={pageStyles.controlLabel}>Program</span>
          <select
            className={pageStyles.courseSelect}
            value={programCode}
            onChange={event => setProgramCode(event.target.value)}
            disabled={editing}
            aria-label="Select program"
          >
            {programs.map(program => <option key={program} value={program}>{program} — {getProgramName(program)}</option>)}
          </select>
        </label>
        <div className={pageStyles.actions}>
          {!editing ? (
            <>
              <button type="button" className={pageStyles.secondaryButton} onClick={() => setEditing(true)}>
                <Edit3 size={16} /> Edit Alignment
              </button>
              <button type="button" className={pageStyles.primaryButton} onClick={handleView}>
                <ChevronRight size={16} /> View
              </button>
            </>
          ) : (
            <>
              <button type="button" className={pageStyles.secondaryButton} onClick={handleCancel}>
                <X size={16} /> Cancel
              </button>
              <button type="button" className={pageStyles.primaryButton} onClick={handleSave}>
                <Check size={16} /> Save
              </button>
            </>
          )}
        </div>
      </div>

      <div className={pageStyles.contextBar}>
        <span><strong>Program:</strong> {programCode} — {getProgramName(programCode)}</span>
        <span className={pageStyles.contextMuted}>{editing ? 'Save or cancel these changes before switching programs.' : 'Program-level alignment master data.'}</span>
      </div>

      <TableScrollRegion label="PROGRAM OUTCOMES & PEO ALIGNMENT" minWidth={960} className={pageStyles.tableRegion}>
        <table className={tbl.alignTable}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 40 }} />
            <col style={{ width: 40 }} />
            <col style={{ width: 56 }} />
            <col />
            <col style={{ width: 48 }} />
            <col style={{ width: 48 }} />
            <col style={{ width: 48 }} />
            <col style={{ width: 48 }} />
          </colgroup>
          <thead>
            <tr>
              <th colSpan={3} className={tbl.center}>PEOs</th>
              <th colSpan={2}>PROGRAM OUTCOMES (POs)</th>
              <th colSpan={4} className={tbl.center}>GRADUATE ATTRIBUTES</th>
            </tr>
            <tr>
              <th className={tbl.center}>1</th>
              <th className={tbl.center}>2</th>
              <th className={tbl.center}>3</th>
              <th colSpan={2} style={{ fontWeight: 400 }}>
                By the time of graduation, the students of the <strong>{getProgramName(programCode) || programCode}</strong> program shall have the ability to:
              </th>
              <th className={tbl.center}>EC</th>
              <th className={tbl.center}>CL</th>
              <th className={tbl.center}>ERC</th>
              <th className={tbl.center}>LL</th>
            </tr>
          </thead>
          <tbody>
            {editRows.map((po, i) => (
              <tr key={i}>
                {[0,1,2].map(pi => (
                  <td key={pi} className={`${tbl.center} ${editing ? tbl.clickable : ''}`}
                    style={editing && po.peos.includes(pi + 1) ? { background: '#DCFCE7' } : undefined}
                    onClick={() => editing && togglePeo(i, pi)}>
                    {po.peos.includes(pi + 1) ? '✔' : (editing ? '☐' : '')}
                  </td>
                ))}
                <td className={tbl.center} style={{ fontWeight: 700 }}>PO{i + 1}</td>
                <td>{po.text}</td>
                {[0,1,2,3].map(gi => (
                  <td key={gi} className={`${tbl.center} ${editing ? tbl.clickable : ''}`}
                    style={editing && po.gas.includes(gi + 1) ? { background: '#DCFCE7' } : undefined}
                    onClick={() => editing && toggleGas(i, gi)}>
                    {po.gas.includes(gi + 1) ? '✔' : (editing ? '☐' : '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableScrollRegion>

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
      header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  )
}

export default PoPeoAlignment
