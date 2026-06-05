import React, { useState, useRef } from 'react';
import { ChevronRight, Eye, FileText, Upload } from 'react-feather';
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
  const fileInputRef = useRef(null);

  const content = (
    <div style={{ padding: 24, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Course Assessment & Evaluation Plan (COAEP)</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            padding: '8px 18px', gap: 8, height: 40,
            background: '#EA1212', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14
          }}
        >
          <Upload size={18} color="#FFFFFF" /> Upload COAEP
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) alert('File selected: ' + file.name);
        }} />
      </div>
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 13 }}>DOCUMENT</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151', fontSize: 13, width: 120 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {docList.map((doc) => (
              <tr key={doc.id} style={{ borderTop: '1px solid #eef2f6' }}>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={18} color="#9ca3af" />
                    <div>
                      <div style={{ fontWeight: 400, color: '#111827' }}>{doc.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Uploaded by {doc.uploadedBy} on {doc.uploadDate}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => setSelectedFile(doc)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: 13, fontWeight: 500, color: '#111827' }}
                    >
                      View <ChevronRight size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {docList.length === 0 && (
              <tr>
                <td colSpan={2} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No documents uploaded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
