import { useState, useEffect } from 'react';
import { ChevronRight, Upload, Edit3, Check, X } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoPoHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getProgramCourses, getCoPoData, saveCoPoData } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';
import { FONT, BTN_DARK, BTN_OUTLINE, BTN_DANGER, TH, THC, TD, TDC } from './uiTokens.js';
import tbl from '../../../styles/AlignmentTables.module.sass';

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
        <select value={courseCode} onChange={e => setCourseCode(e.target.value)}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', marginLeft: 16, fontFamily: FONT }}>
          {courses.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <div style={{ flexGrow: 1 }} />
        {!editing ? (
          <>
            <button onClick={() => setEditing(true)}
              style={BTN_OUTLINE}>
              <Edit3 size={16} /> Edit Alignment
            </button>
            <button onClick={handleView}
              style={BTN_DARK}>
              <ChevronRight size={16} /> View
            </button>
          </>
        ) : (
          <>
            <button onClick={handleSave}
              style={BTN_DARK}>
              <Check size={16} /> Save
            </button>
            <button onClick={handleCancel}
              style={BTN_OUTLINE}>
              <X size={16} /> Cancel
            </button>
          </>
        )}
      </div>

      {course && <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 8, fontFamily: FONT }}><strong>Course:</strong> {courseCode} — {course.name}</div>}

      <div className={tbl.legend}>
        <span><strong>Legend:</strong></span>
        <span><strong>I</strong> – Introductory</span>
        <span><strong>E</strong> – Enabling</span>
        <span><strong>D</strong> – Demonstrative</span>
        {editing && <span style={{ marginLeft: 'auto', color: '#64748b' }}>Click a cell to cycle: blank → I → E → D</span>}
      </div>

      <div style={{ overflow: 'auto', flex: 1 }}>
        <table className={tbl.alignTable}>
          <colgroup>
            <col />
            {poLabels.map(p => <col key={p} style={{ width: 52 }} />)}
          </colgroup>
          <thead>
            <tr>
              <th>After completion of the course, the student should be able to:</th>
              {poLabels.map(p => (
                <th key={p} className={tbl.center}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editCos.map((co, ci) => (
              <tr key={co.id || ci}>
                <td><strong>{co.id}:</strong> {co.description}</td>
                {Array.from({ length: 13 }, (_, pi) => (
                  <td key={pi} className={`${tbl.center} ${editing ? tbl.clickable : ''}`}
                    style={{
                      fontWeight: co.poMappings[pi] ? 700 : 400,
                      ...(editing && co.poMappings[pi] ? { background: '#DCFCE7' } : {}),
                    }}
                    onClick={() => editing && cycleLevel(ci, pi)}>
                    {co.poMappings[pi] || (editing ? '–' : '')}
                  </td>
                ))}
              </tr>
            ))}
            {editCos.length === 0 && (
              <tr><td colSpan={14} style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>No course outcomes defined for this course.</td></tr>
            )}
          </tbody>
        </table>
      </div>

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
