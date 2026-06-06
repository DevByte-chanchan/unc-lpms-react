import { useState, useRef } from 'react';
import { ChevronRight, Upload } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';

const docList = [
  { id: '1', name: 'BSCS_PO_PEO_AY2425.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: '' },
  { id: '2', name: 'BSIT_PO_PEO_AY2425.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: '' },
];

const A4_PAPER = {
  maxWidth: 816, margin: '0 auto', background: '#FFFFFF',
  boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: 48,
  fontFamily: "'Poppins', 'Times New Roman', serif",
};

const PoPeoAlignment = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const content = (
    <div style={{ padding: 24, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>Program Outcomes & PEO Alignment</h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
            padding: '8px 18px', gap: 8, height: 40,
            background: '#EA1212', borderRadius: 6, color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 14
          }}
        >
          <Upload size={18} color="#FFFFFF" /> Upload PO & PEO Alignment
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) alert('File selected: ' + file.name);
        }} />
      </div>
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: 14 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#111827', fontSize: 13 }}>DOCUMENT</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: '#111827', fontSize: 13, width: 120 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {docList.map((doc) => (
              <tr key={doc.id} style={{ borderTop: '1px solid #eef2f6' }}>
                <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                  <div style={{ fontWeight: 400, color: '#111827' }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Uploaded by {doc.uploadedBy} on {doc.uploadDate}</div>
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
