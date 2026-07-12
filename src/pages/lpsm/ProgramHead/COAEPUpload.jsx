import React, { useState, useRef } from 'react';
import { ChevronRight, Upload } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';
import { buildCoaepHtml } from '../../../utils/syllabusPdfHtml.js';
import unclogo from '../../../assets/unclogo.png';

const docList = [
  { id: '1', name: 'BSCS_COAEP_AY2425_2ndSem.xlsx', file_name: 'COAEP_BSCS_SWENG.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS 313L', course_name: 'Software Engineering', submission_date: '2025-01-05', period_label: 'AY 2024-2025, 2nd Sem' },
  { id: '2', name: 'BSIT_COAEP_AY2425_2ndSem.xlsx', file_name: 'COAEP_BSIT_MOBILE.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSIT 212L', course_name: 'Mobile Application Development', submission_date: '2025-01-05', period_label: 'AY 2024-2025, 2nd Sem' },
  { id: '3', name: 'BSCS_COAEP_AY2425_1stSem.xlsx', file_name: 'COAEP_BSCS_SWENG2.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Aug 12, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS 322L', course_name: 'Software Engineering II', submission_date: '2024-08-12', period_label: 'AY 2024-2025, 1st Sem' },
  { id: '4', name: 'BSIT_COAEP_AY2425_1stSem.xlsx', file_name: 'COAEP_BSIT_WEB.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Aug 10, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSIT 311', course_name: 'Web Systems & Technologies', submission_date: '2024-08-10', period_label: 'AY 2024-2025, 1st Sem' },
  { id: '5', name: 'BSCS_COAEP_AY2324_2ndSem.xlsx', file_name: 'COAEP_BSCS_OOP.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Feb 1, 2024', file_url: null, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS 211', course_name: 'Object-Oriented Programming', submission_date: '2024-02-01', period_label: 'AY 2023-2024, 2nd Sem' },
];

const CURRENT_YEAR = new Date().getFullYear();
const yearOptions = [];
for (let i = CURRENT_YEAR; i >= 2000; i--) yearOptions.push(<option key={i} value={i}>{i}</option>);

const coaepData = {
  header: {
    facultyName: 'SANTOS, MARIA C.',
    schoolYear: '2024-2025',
    course: 'BSCS 313L - Software Engineering',
    semester: '1st Semester',
  },
  cos: [
    {
      number: '1.0',
      statement: 'Apply software engineering principles and practices in the development of software systems.',
      ilos: [
        { outcome: 'Define software engineering and differentiate it from other engineering disciplines.', assessmentTool: 'Written Examination' },
        { outcome: 'Identify and describe the phases of the software development life cycle (SDLC).', assessmentTool: 'Recitation / Quiz' },
        { outcome: 'Apply the concept of process models (Waterfall, Agile, etc.) in a given scenario.', assessmentTool: 'Case Study Analysis' },
      ],
    },
    {
      number: '2.0',
      statement: 'Analyze and model software requirements using appropriate techniques and tools.',
      ilos: [
        { outcome: 'Elicit and document software requirements from stakeholders.', assessmentTool: 'Group Project Documentation' },
        { outcome: 'Create UML diagrams (Use Case, Class, Sequence) to model software requirements.', assessmentTool: 'Practical Exercise (UML)' },
        { outcome: 'Validate and verify software requirements against stakeholder needs.', assessmentTool: 'Peer Review / Checklist' },
      ],
    },
    {
      number: '3.0',
      statement: 'Design, implement, and test software solutions following industry-standard practices.',
      ilos: [
        { outcome: 'Design software architecture using appropriate design patterns.', assessmentTool: 'Design Document Submission' },
        { outcome: 'Implement a software module using an object-oriented programming language.', assessmentTool: 'Coding Exercise' },
        { outcome: 'Develop and execute unit tests to verify software correctness.', assessmentTool: 'Unit Test Output / JUnit' },
      ],
    },
    {
      number: '4.0',
      statement: 'Evaluate software quality through systematic testing, code reviews, and adherence to software engineering standards.',
      ilos: [
        { outcome: 'Identify and classify different types of software testing (unit, integration, system, acceptance).', assessmentTool: 'Written Examination' },
        { outcome: 'Perform a code review and identify common coding violations and anti-patterns.', assessmentTool: 'Code Review Checklist' },
        { outcome: 'Measure and evaluate software quality using metrics such as cyclomatic complexity and code coverage.', assessmentTool: 'Lab Report / Static Analysis' },
      ],
    },
  ],
  preparedBy: 'MARIA C. SANTOS',
  approvedBy: 'DENNIS E. IGNACIO',
  dateSubmitted: '09/13/2025',
  effectivityDate: '06/01/2024',
  revisionNo: '0',
  pageNo: '1 of 1',
};

const COAEPUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleView = (doc) => {
    const logoUrl = new URL(unclogo, window.location.origin).href
    const html = buildCoaepHtml(coaepData, logoUrl)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    setSelectedFile({ ...doc, file_url: url })
  }

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>Course Assessment &amp; Evaluation Plan (COAEP)</h2>
        <div style={{ display: 'flex', padding: '4px 8px', gap: 8, background: '#FFF', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.25)', borderRadius: 4, alignItems: 'center', height: 40, boxSizing: 'border-box' }}>
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
          <Upload size={18} color="#FFFFFF" /> Upload COAEP
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
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload COAEP</div>
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
              <div style={{ color: '#6B7280', fontSize: 13 }}>Upload .xlsx, .xls or .csv</div>
              <input type="file" ref={fileInputRef} accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => { const file = e.target.files && e.target.files[0]; setUploadFile(file || null); }} />
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
            } else {
              alert('No file URL available for export.');
            }
          }}
        />
      )}
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
      nav={<SideNavigation mode="program-head" />}
      content={content}
    />
  );
};

export default COAEPUpload;
