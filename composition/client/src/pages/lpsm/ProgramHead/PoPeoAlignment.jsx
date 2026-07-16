import { useState, useEffect } from 'react';
import { ChevronRight, Upload, Edit3, Check, X } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildPoPeoHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getPoPeoData, savePoPeoData, resetPoPeoDefaults } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';
import tbl from '../../../styles/AlignmentTables.module.sass';

const GAS_LABELS = ['EC', 'CL', 'ERC', 'LL']

/* ── app design tokens: matches syllabus tables + existing buttons ── */
const FONT = "'Poppins', sans-serif"
export const BTN_DARK = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', height: 40, background: '#19282C', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: FONT }
export const BTN_OUTLINE = { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', height: 40, background: 'transparent', borderRadius: 6, color: '#000', border: '1px solid #A4A9AF', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: FONT }
const TH = { border: '1px solid #000', padding: '8px 10px', background: '#fff', fontWeight: 700, fontSize: 13, fontFamily: FONT, textAlign: 'left' }
const THC = { ...TH, textAlign: 'center' }
const TD = { border: '1px solid #000', padding: '8px 10px', fontSize: 13, fontFamily: FONT }
const TDC = { ...TD, textAlign: 'center' }

const PoPeoAlignment = () => {
  const [programCode, setProgramCode] = useState('')
  const [data, setData] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editRows, setEditRows] = useState([])

  const programs = getAllPrograms()

  useEffect(() => {
    if (!programCode && programs.length > 0) setProgramCode(programs[0])
  }, [programs])

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
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>PROGRAM OUTCOMES &amp; PEO ALIGNMENT</h2>
        <div style={{ flexGrow: 1 }} />
        {!editing ? (
          <>
            <button onClick={() => setEditing(true)} style={BTN_OUTLINE}>
              <Edit3 size={16} /> Edit Alignment
            </button>
            <button onClick={handleView} style={BTN_DARK}>
              <ChevronRight size={16} /> View
            </button>
          </>
        ) : (
          <>
            <button onClick={handleCancel} style={BTN_OUTLINE}>
              <X size={16} /> Cancel
            </button>
            <button onClick={handleSave} style={BTN_DARK}>
              <Check size={16} /> Save
            </button>
          </>
        )}
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
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
      </div>

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
