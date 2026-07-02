import { useState, useRef } from 'react';
import { ChevronRight, Upload } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoPoHtml } from '../../../utils/syllabusPdfHtml.js';
import { syllabiData } from '../../../data/syllabiData.js';
import unclogo from '../../../assets/unclogo.png';

const docList = [
  { id: '1', name: 'BSCS_CO_PO_AY2425_2ndSem.pdf', file_name: 'BSCS_CO_PO_AY2425_2ndSem.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS101', course_name: 'Data Structures and Algorithms', submission_date: '2025-01-05', period_label: 'AY 2024-2025, 2nd Sem' },
  { id: '2', name: 'BSIT_CO_PO_AY2425_2ndSem.pdf', file_name: 'BSIT_CO_PO_AY2425_2ndSem.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BIT201', course_name: 'Data Structures and Algorithms', submission_date: '2025-01-05', period_label: 'AY 2024-2025, 2nd Sem' },
  { id: '3', name: 'BSCS_CO_PO_AY2425_1stSem.pdf', file_name: 'BSCS_CO_PO_AY2425_1stSem.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Aug 12, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS102', course_name: 'Programming Fundamentals', submission_date: '2024-08-12', period_label: 'AY 2024-2025, 1st Sem' },
  { id: '4', name: 'BSIT_CO_PO_AY2425_1stSem.pdf', file_name: 'BSIT_CO_PO_AY2425_1stSem.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Aug 10, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'IT211', course_name: 'Database Management Systems', submission_date: '2024-08-10', period_label: 'AY 2024-2025, 1st Sem' },
  { id: '5', name: 'BSCS_CO_PO_AY2324_2ndSem.pdf', file_name: 'BSCS_CO_PO_AY2324_2ndSem.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Feb 1, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS103', course_name: 'Data Structures & Algorithms', submission_date: '2024-02-01', period_label: 'AY 2023-2024, 2nd Sem' },
  { id: '6', name: 'BSIT_CO_PO_AY2324_2ndSem.pdf', file_name: 'BSIT_CO_PO_AY2324_2ndSem.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 28, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'IT311', course_name: 'Web Systems & Technologies', submission_date: '2024-01-28', period_label: 'AY 2023-2024, 2nd Sem' },
]

const CURRENT_YEAR = new Date().getFullYear();
const yearOptions = [];
for (let i = CURRENT_YEAR; i >= 2000; i--) yearOptions.push(<option key={i} value={i}>{i}</option>);

const getCourseCos = (courseCode) => {
  const clean = courseCode.replace(/\s/g, '')
  const course = syllabiData.find(s => s.code.replace(/\s/g, '') === clean)
  if (course && course.courseOutcomes && course.courseOutcomes.length > 0) {
    return { name: course.name, cos: course.courseOutcomes }
  }
  return null
}

const CoPoAlignment = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleView = async (doc) => {
    const found = getCourseCos(doc.course_id)
    const cos = found ? found.cos : []
    const courseName = found ? found.name : doc.course_name
    let logoBase64 = ''
    try {
      const resp = await fetch(unclogo)
      if (resp.ok) {
        const blob = await resp.blob()
        logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      }
    } catch { console.warn('Logo fetch failed') }
    const html = buildCoPoHtml(cos, doc.course_id, courseName, logoBase64)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setSelectedFile({ ...doc, file_url: url, _courseName: courseName })
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>Course Outcomes & PO Alignment</h2>
        <div style={{ display: 'flex', padding: '6px 10px', gap: 20, background: '#FFF', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.25)', borderRadius: 4, alignItems: 'center' }}>
          <select style={{ fontSize: 14, outline: 'none', border: 0, color: '#DC2626', background: 'transparent', cursor: 'pointer' }}>{yearOptions}</select>
          <select style={{ fontSize: 14, outline: 'none', border: 0, color: '#DC2626', background: 'transparent', cursor: 'pointer' }}>
            <option value="1st Sem">1st Sem</option>
            <option value="2nd Sem">2nd Sem</option>
          </select>
        </div>
        <div style={{ flexGrow: 1 }} />
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            padding: '8px 18px', gap: 8, height: 40,
            background: '#1F2937', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14
          }}
        >
          <Upload size={18} color="#FFFFFF" /> Upload CO &amp; PO Alignment
        </button>
      </div>
      <div style={{ width: '100%', maxWidth: '100%', display: 'flex', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ flex: 1 }}>DOCUMENT</th>
              <th style={{ width: 120, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {docList.map((doc) => (
              <tr key={doc.id}>
                <td style={{ flex: 1 }}>{doc.name}</td>
                <td style={{ width: 120, textAlign: 'right', fontWeight: 500 }}>
                  <span className="actionLink" style={{ minWidth: 90, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }} onClick={() => handleView(doc)}>
                    View <ChevronRight size={16} />
                  </span>
                </td>
              </tr>
            ))}
            {docList.length === 0 && (
              <tr>
                <td colSpan={2} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No documents uploaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 2 }} onClick={() => { setShowModal(false); setUploadFile(null); }} />
          <div
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: 767, padding: 20, background: '#FFFFFF', borderRadius: 10,
              display: 'flex', flexDirection: 'column', gap: 20, zIndex: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload CO &amp; PO Alignment</div>
            <div
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
              onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer.files && e.dataTransfer.files[0]; if (file) setUploadFile(file); }}
              style={{
                border: '2px dashed #D1D5DB', borderRadius: 8, padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer'
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 12, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={36} color="#9CA3AF" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{uploadFile ? uploadFile.name : 'Drag & drop file here'}</div>
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .pdf file</div>
              <input type="file" ref={fileInputRef} accept=".pdf" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files && e.target.files[0]; setUploadFile(file || null); }} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <button onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; setShowModal(false); }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, color: '#111827', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button onClick={() => {
                if (!uploadFile) { alert('Please choose a file first'); return; }
                alert('File uploaded: ' + uploadFile.name);
                setShowModal(false);
                setUploadFile(null);
              }} style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1F2937', borderRadius: 8, color: '#FFFFFF', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Upload</button>
            </div>
          </div>
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
              a.download = f.file_name || f.name || 'document';
              a.click();
            } else {
              alert('No file URL available for export.');
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
