import { useState } from 'react';
import { Eye, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import PDFViewerModal from '../../../components/PDFViewerModal.jsx';

const docList = [
  { id: '1', name: 'BSCS_PO_PEO_AY2425.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: '' },
  { id: '2', name: 'BSIT_PO_PEO_AY2425.pdf', uploadedBy: 'DANILA, JUNAR', uploadDate: 'Jan 5, 2025', file_url: '' },
];

const PoPeoAlignment = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const content = (
    <div style={{ padding: 24, background: '#FFFFFF', minHeight: 'calc(100vh - 100px)' }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700 }}>Program Outcomes & PEO Alignment</h2>
      <div style={{ overflow: 'auto', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>DOCUMENT</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#374151', width: 120 }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {docList.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={18} color="#9ca3af" />
                  <div>
                    <div style={{ fontWeight: 500, color: '#111827' }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Uploaded by {doc.uploadedBy} on {doc.uploadDate}</div>
                  </div>
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => setSelectedFile(doc)}
                    style={{ padding: '8px 16px', background: '#1F2937', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={15} /> View
                  </button>
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
          onExport={(f) => alert('Export: ' + f.name)}
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

export default PoPeoAlignment;
