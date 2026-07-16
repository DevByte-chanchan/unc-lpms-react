import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Download, CheckCircle, AlertTriangle, Info, Eye } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from '../../styles/DocumentsViewer.module.scss';

const documents = [
  {
    id: '1',
    type: 'Program Outcomes & PEO Alignment',
    shortLabel: 'PO & PEO Alignment',
    fileName: 'BSCS_PO_PEO_AY2425.pdf',
    uploadedBy: 'Dr. Maria Santos',
    uploadDate: 'Jan 5, 2025',
    status: 'Uploaded',
  },
  {
    id: '2',
    type: 'Course Outcomes & PO Alignment',
    shortLabel: 'CO & PO Alignment',
    fileName: 'BSCS_CO_PO_AY2425.pdf',
    uploadedBy: 'Dr. Maria Santos',
    uploadDate: 'Jan 5, 2025',
    status: 'Uploaded',
  },
  {
    id: '3',
    type: 'COAEP',
    shortLabel: 'COAEP',
    fileName: 'COAEP_CS2026S1.pdf',
    uploadedBy: 'Program Head',
    uploadDate: 'May 12, 2026',
    status: 'Uploaded',
  }
];

const DocumentsViewer = () => {
  const { syllabusId } = useParams();

  const syllabi = {
    '1': { courseCode: 'CS 101', courseName: 'Introduction to Computer Science', program: 'Computer Science' },
    '2': { courseCode: 'CS 201', courseName: 'Data Structures', program: 'Computer Science' },
    '3': { courseCode: 'CS 301', courseName: 'Algorithms', program: 'Computer Science' },
    '4': { courseCode: 'MATH 101', courseName: 'Calculus I', program: 'Mathematics' },
    '5': { courseCode: 'CS 102', courseName: 'Programming Fundamentals', program: 'Computer Science' },
    '6': { courseCode: 'MATH 201', courseName: 'Calculus II', program: 'Mathematics' }
  };

  const syllabus = syllabi[syllabusId] || { courseCode: 'Unknown', courseName: 'Unknown Course', program: 'Unknown' };

  const uploadedCount = useMemo(
    () => documents.filter((d) => d.status === 'Uploaded').length,
    []
  );
  const allUploaded = uploadedCount === documents.length;

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>PROGRAM DOCUMENTS</h1>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <Info size={18} className={styles.infoBannerIcon} />
        <span>These documents are uploaded by the Program Head and apply to all course submissions this semester.</span>
      </div>

      {/* Upload Status Summary */}
      <h2 className={styles.sectionLabel}>Document Status</h2>
      <div className={styles.statusGrid}>
        {documents.map((doc) => {
          const uploaded = doc.status === 'Uploaded';
          return (
            <div key={doc.id} className={styles.statusCard}>
              <div className={`${styles.statusCardIconWrap} ${uploaded ? styles.statusCardIconUploaded : styles.statusCardIconPending}`}>
                {uploaded ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <p className={styles.statusCardTitle}>{doc.shortLabel}</p>
                <p className={`${styles.statusCardDate} ${uploaded ? styles.statusCardDateGreen : styles.statusCardDateOrange}`}>
                  {uploaded ? `Uploaded ${doc.uploadDate}` : 'Not yet uploaded'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Documents List */}
      <h2 className={styles.sectionLabel}>View Documents</h2>
      <div className={styles.docCardsList}>
        {documents.map((doc) => {
          const uploaded = doc.status === 'Uploaded';

          return (
            <div key={doc.id} className={styles.docCard}>
              <h3 className={styles.docCardTitle}>{doc.type}</h3>

              <div className={`${styles.statusBadge} ${uploaded ? styles.statusBadgeUploaded : styles.statusBadgePending}`}>
                {uploaded
                  ? <><CheckCircle size={16} className={styles.statusBadgeIcon} /> Uploaded</>
                  : <><AlertTriangle size={16} className={styles.statusBadgeIcon} /> Not Available</>
                }
              </div>

              {uploaded ? (
                <>
                  <div className={styles.fileInfoBox}>
                    <p className={styles.fileName}>{doc.fileName}</p>
                    <p className={styles.fileMeta}>Uploaded by {doc.uploadedBy} on {doc.uploadDate}</p>
                  </div>

                  <div className={styles.actionRow}>
                    <button className={styles.btnDownload}>
                      <Download size={16} /> Download
                    </button>
                    <button className={styles.btnView}>
                      <Eye size={16} /> View
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.notAvailableBox}>
                  <p className={styles.notAvailableText}>This document has not been uploaded yet.</p>
                  <p className={styles.notAvailableHint}>Please contact your Program Head.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning if not all uploaded */}
      {!allUploaded && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={18} className={styles.warningBannerIcon} />
          <span>Some documents are still pending. You may not be able to submit your learning plan until all 3 documents are available.</span>
        </div>
      )}
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Instructor" name="CASIMERO, DANNY" />}
      nav={<SideNavigation mode="instructor" />}
      content={content}
    />
  );
};

export default DocumentsViewer;
