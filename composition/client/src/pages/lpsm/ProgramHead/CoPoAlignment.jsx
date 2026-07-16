import { useState, useEffect } from 'react';
import { ChevronRight, Upload, Edit3, Check, X } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoPoHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getProgramCourses, getCoPoData, saveCoPoData } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';

const poLabels = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PO13']

const levels = ['I (Introductory)', 'E (Enabling)', 'D (Demonstrative)']

const CoPoAlignment = () => {
  const [programCode, setProgramCode] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courses, setCourses] = useState([])
  const [data, setData] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [editCos, setEditCos] = useState([])

  const programs = getAllPrograms()

  useEffect(() => {
    if (!programCode && programs.length > 0) setProgramCode(programs[0])
  }, [programs])

  useEffect(() => {
    if (programCode) {
      const cs = getProgramCourses(programCode)
      setCourses(cs)
      if (cs.length > 0 && !cs.find(c => c.code === courseCode)) setCourseCode(cs[0].code)
    }
  }, [programCode])

  useEffect(() => {
    if (programCode && courseCode) {
      const d = getCoPoData(programCode, courseCode)
      setData(d)
      setEditCos((d.courseOutcomes || []).map(co => ({
        ...co,
        poMappings: co.poMappings ? [...co.poMappings] : Array(13).fill('')
      })))
    }
  }, [programCode, courseCode])

  const handleView = () => {
    if (!data) return
    const course = courses.find(c => c.code === courseCode)
    const logoUrl = new URL(unclogo, window.location.origin).href
    const html = buildCoPoHtml(editCos, courseCode, course?.name || '', logoUrl)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setSelectedFile({ name: `${programCode}_${courseCode}_CO_PO.html`, file_url: url })
  }

  const setMapping = (coIdx, poIdx, val) => {
    const next = editCos.map(co => ({ ...co, poMappings: [...co.poMappings] }))
    next[coIdx].poMappings[poIdx] = val
    setEditCos(next)
  }

  const cycleLevel = (coIdx, poIdx) => {
    const current = editCos[coIdx].poMappings[poIdx] || ''
    const vals = ['', 'I', 'E', 'D']
    const next = vals[(vals.indexOf(current) + 1) % vals.length]
    setMapping(coIdx, poIdx, next)
  }

  const handleSave = () => {
    saveCoPoData(programCode, courseCode, { courseOutcomes: editCos.map(co => ({ ...co, poMappings: [...co.poMappings] })) })
    setData({ courseOutcomes: editCos.map(co => ({ ...co, poMappings: [...co.poMappings] })) })
    setEditing(false)
  }

  const handleCancel = () => {
    if (data) setEditCos((data.courseOutcomes || []).map(co => ({
      ...co, poMappings: co.poMappings ? [...co.poMappings] : Array(13).fill('')
    })))
    setEditing(false)
  }

  const course = courses.find(c => c.code === courseCode)

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>COURSE OUTCOMES &amp; PO ALIGNMENT</h2>
        <select value={programCode} onChange={e => { setProgramCode(e.target.value); setCourseCode('') }}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', marginLeft: 16 }}>
          {programs.map(p => <option key={p} value={p}>{p} — {getProgramName(p)}</option>)}
        </select>
        <select value={courseCode} onChange={e => setCourseCode(e.target.value)}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer' }}>
          {courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
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

      {course && <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 8 }}><strong>Course:</strong> {courseCode} — {course.name}</div>}

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F3F4F6' }}>
              <th rowSpan={2} style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', minWidth: 36 }}>#</th>
              <th rowSpan={2} style={{ border: '1px solid #D1D5DB', padding: 6, minWidth: 220 }}>Course Outcome</th>
              <th colSpan={13} style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center' }}>PROGRAM OUTCOMES</th>
            </tr>
            <tr style={{ background: '#F3F4F6' }}>
              {poLabels.map(p => (
                <th key={p} style={{ border: '1px solid #D1D5DB', padding: 4, textAlign: 'center', minWidth: 30, fontSize: 11 }}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editCos.map((co, ci) => (
              <tr key={co.id || ci}>
                <td style={{ border: '1px solid #D1D5DB', padding: 6, textAlign: 'center', fontWeight: 600 }}>{co.id}</td>
                <td style={{ border: '1px solid #D1D5DB', padding: 6 }}>{co.description}</td>
                {Array.from({ length: 13 }, (_, pi) => (
                  <td key={pi} style={{
                    border: '1px solid #D1D5DB', padding: 4, textAlign: 'center', cursor: editing ? 'pointer' : 'default',
                    background: editing ? (co.poMappings[pi] ? '#DCFCE7' : '#FEF3C7') : 'transparent',
                    fontWeight: co.poMappings[pi] ? 600 : 400,
                    fontSize: 12
                  }} onClick={() => editing && cycleLevel(ci, pi)}>
                    {co.poMappings[pi] || (editing ? '-' : '')}
                  </td>
                ))}
              </tr>
            ))}
            {editCos.length === 0 && (
              <tr><td colSpan={15} style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>No course outcomes defined for this course.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'flex', gap: 16 }}>
          <span><strong>I</strong> — Introductory</span>
          <span><strong>E</strong> — Enabling</span>
          <span><strong>D</strong> — Demonstrative</span>
          <span style={{ marginLeft: 'auto' }}>Click a cell to cycle: blank → I → E → D</span>
        </div>
      )}

      {selectedFile && (
        <PDFViewerModal
          file={selectedFile}
          kind="CO & PO Alignment"
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

export default CoPoAlignment
