import { useState, useEffect } from 'react';
import { ChevronRight, Upload, Trash2 } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getProgramCourses, getCoaepData, saveCoaepData } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';
import { FONT, BTN_DARK, BTN_OUTLINE, BTN_DANGER, TH, THC, TD, TDC } from './uiTokens.js';
import { fetchJson } from '../../../utils/api.js';
import tbl from '../../../styles/AlignmentTables.module.sass';

const CURRENT_YEAR = new Date().getFullYear()

const COAEPUpload = () => {
  const [programCode, setProgramCode] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [courses, setCourses] = useState([])
  const [coaepRecord, setCoaepRecord] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [form, setForm] = useState({
    facultyName: '', schoolYear: String(CURRENT_YEAR), semester: '1st Semester',
    preparedBy: '', approvedBy: '',
  })

  const programs = getAllPrograms()

  useEffect(() => {
    if (!programCode && programs.length > 0) setProgramCode(programs[0])
  }, [programs])

  // Programs + courses come from the DATABASE (assignments carry both);
  // static lists are only a fallback when the server is unreachable.
  const [serverPrograms, setServerPrograms] = useState([])
  useEffect(() => {
    let mounted = true
    fetchJson('/api/assignments')
      .then(resp => {
        if (!mounted) return
        const rows = Array.isArray(resp) ? resp : (resp.data || [])
        const seenC = new Set(); const cs = []
        const seenP = new Set(); const ps = []
        rows.forEach(r => {
          const c = r.ProgramCourseOffering?.Course
          const p = r.ProgramCourseOffering?.Program
          if (c?.course_no && !seenC.has(c.course_no)) {
            seenC.add(c.course_no)
            cs.push({ code: c.course_no, name: c.course_title || '' })
          }
          if (p?.name && !seenP.has(p.name)) { seenP.add(p.name); ps.push(p.name) }
        })
        cs.sort((a, b) => a.code.localeCompare(b.code))
        if (cs.length > 0) {
          setCourses(cs)
          setServerPrograms(ps)
          if (ps.length > 0) setProgramCode(ps[0])
          if (!cs.find(c => c.code === courseCode)) setCourseCode(cs[0].code)
        } else {
          const fallback = getProgramCourses(programCode)
          setCourses(fallback)
          if (fallback.length > 0 && !fallback.find(c => c.code === courseCode)) setCourseCode(fallback[0].code)
        }
      })
      .catch(() => {
        if (!mounted) return
        const fallback = getProgramCourses(programCode || programs[0])
        setCourses(fallback)
        if (fallback.length > 0 && !fallback.find(c => c.code === courseCode)) setCourseCode(fallback[0].code)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (programCode && courseCode) {
      const rec = getCoaepData(programCode, courseCode)
      setCoaepRecord(rec)
    }
  }, [programCode, courseCode])

  // Real COAEP content (COs, ILOs, assessment tools) straight from the database
  const [serverCoaep, setServerCoaep] = useState(null)
  useEffect(() => {
    if (!courseCode) return
    let mounted = true
    setServerCoaep(null)
    fetchJson(`/api/coaep/${encodeURIComponent(courseCode)}`)
      .then(d => { if (mounted) setServerCoaep(d) })
      .catch(() => { if (mounted) setServerCoaep(null) })
    return () => { mounted = false }
  }, [courseCode])

  // What we display/print: a manually-uploaded record with real content, otherwise
  // a record built from the course's actual DB data — never a blank page.
  // Records saved with the old one-CO placeholder are treated as absent.
  const courseObj = courses.find(c => c.code === courseCode)
  // Official COAEP form holds a maximum of 4 COs — cap regardless of source
  // (old saved records may contain more, e.g. merged revisions)
  const capCos = (rec) => rec ? { ...rec, cos: (rec.cos || []).slice(0, 4) } : rec
  const uploaded = coaepRecord && (coaepRecord.cos || []).length > 1 ? capCos(coaepRecord) : null
  const effectiveRecord = uploaded || (serverCoaep ? capCos({
    header: {
      facultyName: 'CASIMERO, DANNY',
      schoolYear: '2025-2026',
      course: `${courseCode} — ${serverCoaep.course?.title || courseObj?.name || ''}`,
      semester: '1st Semester',
    },
    cos: serverCoaep.cos,
    preparedBy: 'CASIMERO, DANNY',
    approvedBy: 'DANILA, JUNAR (Program Head)',
    dateSubmitted: new Date().toLocaleDateString('en-US'),
  }) : null)

  const handleView = () => {
    if (!effectiveRecord) return
    const logoUrl = new URL(unclogo, window.location.origin).href
    const html = buildCoaepHtml(effectiveRecord, logoUrl)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setSelectedFile({
      name: `${programCode}_${courseCode}_COAEP.html`,
      file_name: `${programCode}_${courseCode}_COAEP.html`,
      file_url: url,
      uploadedBy: 'DANILA, JUNAR',
      uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    })
  }

  const handleUpload = () => {
    if (!form.facultyName || !form.preparedBy) {
      alert('Please fill in Faculty Name and Prepared By fields.')
      return
    }
    const course = courses.find(c => c.code === courseCode)
    const data = {
      header: {
        facultyName: form.facultyName,
        schoolYear: form.schoolYear,
        course: `${courseCode} — ${course?.name || ''}`,
        semester: form.semester,
      },
      // Use the course's real COs/ILOs from the database when available
      cos: (serverCoaep?.cos && serverCoaep.cos.length > 0) ? serverCoaep.cos : [
        {
          number: '1.0',
          statement: 'Course Outcome 1',
          ilos: [
            { outcome: 'ILO description', assessmentTool: 'Assessment tool' },
          ],
        },
      ],
      preparedBy: form.preparedBy,
      approvedBy: form.approvedBy,
      dateSubmitted: new Date().toLocaleDateString('en-US'),
      effectivityDate: '06/01/2024',
      revisionNo: '0',
      pageNo: '1 of 1',
    }
    saveCoaepData(programCode, courseCode, data)
    setCoaepRecord(data)
    setShowUpload(false)
    setForm({ facultyName: '', schoolYear: String(CURRENT_YEAR), semester: '1st Semester', preparedBy: '', approvedBy: '' })
  }

  const handleDelete = () => {
    saveCoaepData(programCode, courseCode, null)
    setCoaepRecord(null)
  }

  const course = courses.find(c => c.code === courseCode)

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>COURSE ASSESSMENT &amp; EVALUATION PLAN (COAEP)</h2>
        <select value={courseCode} onChange={e => setCourseCode(e.target.value)}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', marginLeft: 16, fontFamily: FONT }}>
          {courses.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <div style={{ flexGrow: 1 }} />
        {coaepRecord && (
          <>
            <button onClick={handleView}
              style={BTN_DARK}>
              <ChevronRight size={16} /> View COAEP
            </button>
            <button onClick={handleDelete}
              style={BTN_DANGER}>
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
        <button onClick={() => setShowUpload(true)}
          style={BTN_DARK}>
          <Upload size={16} /> {coaepRecord ? 'Replace' : 'Upload'} COAEP
        </button>
      </div>

      {course && <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 12, fontFamily: FONT }}><strong>Course:</strong> {course.name}</div>}

      {effectiveRecord ? (
        // Table view — same design as CO-PO / PO-PEO alignment pages
        <div style={{ overflow: 'auto', flex: 1 }}>
          <table className={tbl.alignTable}>
            <colgroup>
              <col style={{ width: 40 }} />
              <col style={{ width: '21%' }} />
              <col style={{ width: '29%' }} />
              <col style={{ width: '22%' }} />
              <col />
            </colgroup>
            <thead>
              <tr>
                <th className={tbl.center}>#</th>
                <th>Course Outcome Statement</th>
                <th>Intended Learning Outcome</th>
                <th>Assessment Tool</th>
                <th>Performance Target</th>
              </tr>
            </thead>
            <tbody>
              {(effectiveRecord.cos || []).map((co, ci) => {
                const ilos = (co.ilos || []).length ? co.ilos : [{ outcome: '', assessmentTool: '' }]
                return ilos.map((ilo, ii) => (
                  <tr key={`${ci}-${ii}`}>
                    {ii === 0 && <td className={tbl.center} style={{ fontWeight: 700 }} rowSpan={ilos.length}>{ci + 1}</td>}
                    {ii === 0 && <td rowSpan={ilos.length}>{co.statement}</td>}
                    <td>{ilo.outcome}</td>
                    <td>{ilo.assessmentTool || '—'}</td>
                    <td>{ilo.performanceTarget || effectiveRecord.performanceTarget || 'At least 90% of enrolled students with a rating of at least 60% of the total score'}</td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9CA3AF', fontSize: 16 }}>
          This course has no composed learning plan yet — COAEP content will appear once its COs and ILOs exist.
        </div>
      )}

      {showUpload && (
        <div>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => { setShowUpload(false) }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 540, padding: 24, background: '#FFF', borderRadius: 10, zIndex: 3,
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>{coaepRecord ? 'Replace' : 'Upload'} COAEP</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Faculty Name</label>
                <input value={form.facultyName} onChange={e => setForm(f => ({ ...f, facultyName: e.target.value }))}
                  placeholder="e.g. SANTOS, MARIA C."
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>School Year</label>
                  <input value={form.schoolYear} onChange={e => setForm(f => ({ ...f, schoolYear: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Semester</label>
                  <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', background: '#FFF' }}>
                    <option>1st Semester</option>
                    <option>2nd Semester</option>
                    <option>Summer</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Prepared By</label>
                <input value={form.preparedBy} onChange={e => setForm(f => ({ ...f, preparedBy: e.target.value }))}
                  placeholder="e.g. MARIA C. SANTOS"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Approved By</label>
                <input value={form.approvedBy} onChange={e => setForm(f => ({ ...f, approvedBy: e.target.value }))}
                  placeholder="e.g. DENNIS E. IGNACIO"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={() => setShowUpload(false)}
                style={{ flex: 1, height: 40, background: '#FFF', border: '1px solid #111827', borderRadius: 6, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={handleUpload}
                style={{ flex: 1, height: 40, background: '#1F2937', borderRadius: 6, color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Save COAEP</button>
            </div>
          </div>
        </div>
      )}

      {selectedFile && (
        <PDFViewerModal
          file={selectedFile}
          kind="Course Assessment & Evaluation Plan (COAEP)"
          onClose={() => {
            if (selectedFile.file_url?.startsWith('blob:')) URL.revokeObjectURL(selectedFile.file_url)
            setSelectedFile(null)
          }}
          onExport={(f) => {
            if (f.file_url) {
              const a = document.createElement('a');
              a.href = f.file_url;
              a.download = f.file_name || f.name || 'document';
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

export default COAEPUpload
