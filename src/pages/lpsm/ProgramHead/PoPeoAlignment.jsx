import { useState, useRef } from 'react';
import { ChevronRight, Upload } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';

const TEST_PDF = 'https://pdfobject.com/pdf/sample.pdf';

const docList = [
  { id: '1', name: 'BSCS_PO_PEO_AY2425.pdf', file_name: 'BSCS_PO_PEO_AY2425.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: TEST_PDF, instructor_name: 'DANILA, JUNAR', course_id: 'BSCS 313L', course_name: 'Software Engineering', submission_date: '2025-01-05', period_label: 'AY 2024-2025, 2nd Sem' },
  { id: '2', name: 'BSIT_PO_PEO_AY2425.pdf', file_name: 'BSIT_PO_PEO_AY2425.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: TEST_PDF, instructor_name: 'DANILA, JUNAR', course_id: 'BSIT 212L', course_name: 'Mobile Application Development', submission_date: '2025-01-05', period_label: 'AY 2024-2025, 2nd Sem' },
];

const A4_PAPER = {
  maxWidth: 816, margin: '0 auto', background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 48,
  fontFamily: "'Poppins', 'Times New Roman', serif",
};

const CURRENT_YEAR = new Date().getFullYear();
const yearOptions = [];
for (let i = CURRENT_YEAR; i >= 2000; i--) yearOptions.push(<option key={i} value={i}>{i}</option>);

const PoPeoAlignment = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef(null);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: 10, padding: '20px 30px', background: '#FFFFFF', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', width: '100%', flexDirection: 'row', height: 40, alignItems: 'center', gap: 15, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap' }}>Program Outcomes & PEO Alignment</h2>
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
          <Upload size={18} color="#FFFFFF" /> Upload PO &amp; PEO Alignment
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
            <div style={{ fontSize: 20, fontWeight: 600 }}>Upload PO &amp; PEO Alignment</div>
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
          kind="PO & PEO Alignment"
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
          <div style={A4_PAPER}>
            <div style={{ textAlign: 'center', marginBottom: 32, borderBottom: '2px solid #1e3a5f', paddingBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.02em' }}>
                Program Outcomes & Program Educational Outcomes Alignment
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 6 }}>
                {selectedFile.name}
              </div>
            </div>
            <div style={{ marginBottom: 24, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px' }}><strong>Document:</strong> {selectedFile.name}</p>
              <p style={{ margin: '0 0 8px' }}><strong>Uploaded by:</strong> {selectedFile.uploadedBy}</p>
              <p style={{ margin: 0 }}><strong>Date:</strong> {selectedFile.uploadDate}</p>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 40, padding: 20, border: '1px dashed #CBD5E1', borderRadius: 8 }}>
              The aligned document content will be displayed here once the PDF is available.
            </div>
            <div style={{ marginTop: 32, fontSize: 10, color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: 12, textAlign: 'center' }}>
              University of Nueva Caceres &middot; Learning Plan Management System
            </div>
          </div>
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

export default PoPeoAlignment;
