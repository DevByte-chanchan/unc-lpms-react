import { useState, useEffect } from 'react';
import { ChevronRight, Upload, Trash2 } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import { getAllPrograms, getProgramName, getProgramCourses, getCoaepData, saveCoaepData } from '../../../utils/programCurriculumData.js';
import unclogo from '../../../assets/unclogo.png';

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

  useEffect(() => {
    if (programCode) {
      const cs = getProgramCourses(programCode)
      setCourses(cs)
      if (cs.length > 0 && !cs.find(c => c.code === courseCode)) setCourseCode(cs[0].code)
    }
  }, [programCode])

  useEffect(() => {
    if (programCode && courseCode) {
      const rec = getCoaepData(programCode, courseCode)
      setCoaepRecord(rec)
    }
  }, [programCode, courseCode])

  const handleView = () => {
    if (!coaepRecord) return
    const logoUrl = new URL(unclogo, window.location.origin).href
    const html = buildCoaepHtml(coaepRecord, logoUrl)
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
      cos: [
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
        <select value={programCode} onChange={e => { setProgramCode(e.target.value); setCourseCode('') }}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer', marginLeft: 16 }}>
          {programs.map(p => <option key={p} value={p}>{p} — {getProgramName(p)}</option>)}
        </select>
        <select value={courseCode} onChange={e => setCourseCode(e.target.value)}
          style={{ padding: '6px 12px', fontSize: 14, borderRadius: 4, border: '1px solid #D1D5DB', background: '#FFF', cursor: 'pointer' }}>
          {courses.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>
        <div style={{ flexGrow: 1 }} />
        {coaepRecord && (
          <>
            <button onClick={handleView}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#2563EB', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              <ChevronRight size={16} /> View COAEP
            </button>
            <button onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#DC2626', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
        <button onClick={() => setShowUpload(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', height: 40, background: '#1F2937', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          <Upload size={16} /> {coaepRecord ? 'Replace' : 'Upload'} COAEP
        </button>
      </div>

      {course && <div style={{ fontSize: 14, color: '#4B5563', marginBottom: 12 }}><strong>Program:</strong> {programCode} — {getProgramName(programCode)} &nbsp;|&nbsp; <strong>Course:</strong> {courseCode} — {course.name}</div>}

      {coaepRecord ? (
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>COAEP Details</h3>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <tbody>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600, width: 140 }}>Faculty:</td><td style={{ padding: '6px 12px' }}>{coaepRecord.header?.facultyName || '—'}</td></tr>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600 }}>School Year:</td><td style={{ padding: '6px 12px' }}>{coaepRecord.header?.schoolYear || '—'}</td></tr>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600 }}>Semester:</td><td style={{ padding: '6px 12px' }}>{coaepRecord.header?.semester || '—'}</td></tr>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600 }}>Prepared By:</td><td style={{ padding: '6px 12px' }}>{coaepRecord.preparedBy || '—'}</td></tr>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600 }}>Approved By:</td><td style={{ padding: '6px 12px' }}>{coaepRecord.approvedBy || '—'}</td></tr>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600 }}>Date Submitted:</td><td style={{ padding: '6px 12px' }}>{coaepRecord.dateSubmitted || '—'}</td></tr>
              <tr><td style={{ padding: '6px 12px', fontWeight: 600, verticalAlign: 'top' }}>Course Outcomes:</td>
                <td style={{ padding: '6px 12px' }}>{(coaepRecord.cos || []).length} CO(s) defined</td></tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#9CA3AF', fontSize: 16 }}>
          No COAEP uploaded for this course in {programCode} program.
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
