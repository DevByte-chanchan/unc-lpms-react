import { useState, useEffect } from 'react';
import { ChevronRight, Upload, Edit3, Check, X } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildPoPeoHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getPoPeoData, savePoPeoData, resetPoPeoDefaults } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';

const GAS_LABELS = ['EC', 'CL', 'ERC', 'LL']

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
        <select value={programCode} onChange={e => setProgramCode(e.target.value)}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', marginLeft: 16 }}>
          {programs.map(p => <option key={p} value={p}>{p} — {getProgramName(p)}</option>)}
        </select>
        <div style={{ flexGrow: 1 }} />
        {!editing ? (
          <>
            <button onClick={() => setEditing(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#1F2937', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              <Edit3 size={16} /> Edit Alignment
            </button>
            <button onClick={handleView}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#2563EB', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              <ChevronRight size={16} /> View
            </button>
          </>
        ) : (
          <>
            <button onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#059669', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              <Check size={16} /> Save
            </button>
            <button onClick={handleCancel}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#6B7280', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              <X size={16} /> Cancel
            </button>
          </>
        )}
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th rowSpan={2} style={{ border: '1px solid #D1D5DB', padding: 8, width: 40, textAlign: 'center' }}>#</th>
              <th rowSpan={2} style={{ border: '1px solid #D1D5DB', padding: 8 }}>PROGRAM OUTCOMES (POs)</th>
              <th colSpan={3} style={{ border: '1px solid #D1D5DB', padding: 8, textAlign: 'center' }}>PEOs</th>
              <th colSpan={4} style={{ border: '1px solid #D1D5DB', padding: 8, textAlign: 'center' }}>GRADUATE ATTRIBUTES</th>
            </tr>
            <tr style={{ background: '#F3F4F6' }}>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>PEO1</td>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>PEO2</td>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>PEO3</td>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>EC</td>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>CL</td>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>ERC</td>
              <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>LL</td>
            </tr>
          </thead>
          <tbody>
            {editRows.map((po, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #D1D5DB', padding: 8, textAlign: 'center', fontWeight: 600 }}>PO{i + 1}</td>
                <td style={{ border: '1px solid #D1D5DB', padding: 8 }}>{po.text}</td>
                {[0,1,2].map(pi => (
                  <td key={pi} style={{ border: '1px solid #D1D5DB', padding: 8, textAlign: 'center', cursor: editing ? 'pointer' : 'default', background: editing && po.peos.includes(pi + 1) ? '#DCFCE7' : 'transparent' }}
                    onClick={() => editing && togglePeo(i, pi)}>
                    {po.peos.includes(pi + 1) ? (editing ? '✓' : '✔') : (editing ? '☐' : '')}
                  </td>
                ))}
                {[0,1,2,3].map(gi => (
                  <td key={gi} style={{ border: '1px solid #D1D5DB', padding: 8, textAlign: 'center', cursor: editing ? 'pointer' : 'default', background: editing && po.gas.includes(gi + 1) ? '#DCFCE7' : 'transparent' }}
                    onClick={() => editing && toggleGas(i, gi)}>
                    {po.gas.includes(gi + 1) ? (editing ? '✓' : '✔') : (editing ? '☐' : '')}
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
