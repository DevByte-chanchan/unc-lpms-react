import React, { useState, useRef } from 'react';
import { ChevronRight, Upload } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';

const A4_PAPER = {
  maxWidth: 816, margin: '0 auto', background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 48,
  fontFamily: "'Poppins', 'Times New Roman', serif",
};

const docList = [
  { id: '1', name: 'BSCS_COAEP_AY2425.xlsx', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: '' },
  { id: '2', name: 'BSIT_COAEP_AY2425.xlsx', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: '' },
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
    preparedBy: 'MARIA C. SANTOS',
    approvedBy: 'DENNIS E. IGNACIO',
    dateSubmitted: '09/13/2025',
    effectivityDate: '06/01/2024',
    revisionNo: '0',
    pageNo: '1 of 1',
  },
  cos: [
    {
      number: '1',
      statement: 'Apply software engineering principles and practices in the development of software systems.',
      ilos: [
        { outcome: 'Define software engineering and differentiate it from other engineering disciplines.', assessmentTool: 'Written Examination', performanceTarget: '75% of students will achieve a passing score of 70% or higher.' },
        { outcome: 'Identify and describe the phases of the software development life cycle (SDLC).', assessmentTool: 'Recitation / Quiz', performanceTarget: '80% of students will correctly identify all SDLC phases.' },
        { outcome: 'Apply the concept of process models (Waterfall, Agile, etc.) in a given scenario.', assessmentTool: 'Case Study Analysis', performanceTarget: '70% of students will demonstrate proficiency in selecting the appropriate process model.' },
      ],
    },
    {
      number: '2',
      statement: 'Analyze and model software requirements using appropriate techniques and tools.',
      ilos: [
        { outcome: 'Elicit and document software requirements from stakeholders.', assessmentTool: 'Group Project Documentation', performanceTarget: '85% of groups will produce a complete SRS document.' },
        { outcome: 'Create UML diagrams (Use Case, Class, Sequence) to model software requirements.', assessmentTool: 'Practical Exercise (UML)', performanceTarget: '80% of students will create correct UML diagrams for a given system.' },
        { outcome: 'Validate and verify software requirements against stakeholder needs.', assessmentTool: 'Peer Review / Checklist', performanceTarget: '75% of students will identify at least 3 requirement inconsistencies.' },
      ],
    },
    {
      number: '3',
      statement: 'Design, implement, and test software solutions following industry-standard practices.',
      ilos: [
        { outcome: 'Design software architecture using appropriate design patterns.', assessmentTool: 'Design Document Submission', performanceTarget: '80% of groups will apply at least one design pattern correctly.' },
        { outcome: 'Implement a software module using an object-oriented programming language.', assessmentTool: 'Coding Exercise', performanceTarget: '70% of students will produce a working implementation meeting the given specifications.' },
        { outcome: 'Develop and execute unit tests to verify software correctness.', assessmentTool: 'Unit Test Output / JUnit', performanceTarget: '75% of students will achieve at least 70% code coverage.' },
      ],
    },
    {
      number: '4',
      statement: 'Evaluate software quality through systematic testing, code reviews, and adherence to software engineering standards.',
      ilos: [
        { outcome: 'Identify and classify different types of software testing (unit, integration, system, acceptance).', assessmentTool: 'Written Examination', performanceTarget: '80% of students will correctly classify testing types with 75% accuracy.' },
        { outcome: 'Perform a code review and identify common coding violations and anti-patterns.', assessmentTool: 'Code Review Checklist', performanceTarget: '85% of students will identify at least 5 code quality issues in a sample codebase.' },
        { outcome: 'Measure and evaluate software quality using metrics such as cyclomatic complexity and code coverage.', assessmentTool: 'Lab Report / Static Analysis', performanceTarget: '70% of students will achieve acceptable metric thresholds on a given codebase.' },
      ],
    },
  ],
};

const COAEPTable = ({ data, paperStyle }) => (
  <div style={paperStyle || A4_PAPER}>
    <div style={{ textAlign: 'center', marginBottom: 24, borderBottom: '2px solid #1e3a5f', paddingBottom: 14 }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.03em' }}>COURSE ASSESSMENT & EVALUATION PLAN</div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{data.header.facultyName} &middot; {data.header.course} &middot; {data.header.schoolYear} ({data.header.semester})</div>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #CBD5E1', fontSize: 11.5 }}>
      <thead>
        <tr style={{ background: '#1e3a5f', color: '#FFFFFF' }}>
          <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Course Outcome Statement</th>
          <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Intended Learning Outcome</th>
          <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Assessment Tool</th>
          <th style={{ padding: '10px 12px', border: '1px solid #334155', fontWeight: 600, textAlign: 'left' }}>Performance Target</th>
        </tr>
      </thead>
      <tbody>
        {data.cos.map((co, coIdx) => (
          <React.Fragment key={coIdx}>
            {co.ilos.map((ilo, iloIdx) => (
              <tr key={`${coIdx}-${iloIdx}`} style={{ background: iloIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                {iloIdx === 0 ? (
                  <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0', verticalAlign: 'top', fontWeight: 600 }} rowSpan={co.ilos.length}>
                    {co.number}. {co.statement}
                  </td>
                ) : null}
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{ilo.outcome}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{ilo.assessmentTool}</td>
                <td style={{ padding: '8px 12px', border: '1px solid #E2E8F0' }}>{ilo.performanceTarget}</td>
              </tr>
            ))}
          </React.Fragment>
        ))}
      </tbody>
    </table>
    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748B', borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
      <span>Prepared by: {data.header.preparedBy}</span>
      <span>Approved by: {data.header.approvedBy}</span>
      <span>Date: {data.header.dateSubmitted}</span>
    </div>
  </div>
);

const COAEPUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>Course Assessment &amp; Evaluation Plan (COAEP)</h2>
        <div style={{ display: 'flex', padding: '4px 8px', gap: 10, background: '#FFF', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.25)', borderRadius: 4, height: 32, alignItems: 'center' }}>
          <select style={{ fontSize: 12, outline: 'none', border: 0, color: '#DC2626', background: 'transparent', cursor: 'pointer', padding: '0 4px' }}>{yearOptions}</select>
          <select style={{ fontSize: 12, outline: 'none', border: 0, color: '#DC2626', background: 'transparent', cursor: 'pointer', padding: '0 4px' }}>
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
            background: '#EA1212', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14
          }}
        >
          <Upload size={18} color="#FFFFFF" /> Upload COAEP
        </button>
      </div>
      <div style={{ width: '100%', maxWidth: '100%', display: 'flex', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#111827', fontSize: 13, borderBottom: '2px solid #eef2f6' }}>DOCUMENT</th>
              <th style={{ padding: '10px 12px', borderBottom: '2px solid #eef2f6' }}></th>
            </tr>
          </thead>
          <tbody>
            {docList.map((doc) => (
              <tr key={doc.id} style={{ borderTop: '1px solid #eef2f6' }}>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle', width: '99%' }}>
                  <div style={{ fontWeight: 400, color: '#111827' }}>{doc.name}</div>
                </td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button
                    onClick={() => setSelectedFile(doc)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 13, fontWeight: 500, color: '#111827' }}
                  >
                    View <ChevronRight size={16} />
                  </button>
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
          onClose={() => setSelectedFile(null)}
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
        >
          <COAEPTable data={coaepData} />
        </PDFViewerModal>
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
