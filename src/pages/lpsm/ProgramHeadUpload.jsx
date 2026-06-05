import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, Info, Eye } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from '../../styles/ProgramHeadUpload.module.scss';

const documentDefinitions = [
  {
    key: 'po_peo_alignment',
    title: 'Program Outcomes & PEO Alignment',
    shortLabel: 'PO & PEO Alignment',
    description: 'Document showing alignment between program educational objectives (PEOs) and program outcomes.'
  },
  {
    key: 'co_po_alignment',
    title: 'Course Outcomes & PO Alignment',
    shortLabel: 'CO & PO Alignment',
    description: 'Document mapping all course outcomes to program outcomes.'
  },
  {
    key: 'coaep',
    title: 'COAEP',
    shortLabel: 'COAEP',
    description: 'Course Objectives and Assessment Evaluation Plan document.'
  }
];

const ProgramHeadUpload = () => {
  const navigate = useNavigate();

  // Simulated upload state – 2 of 3 uploaded by default
  const [uploads, setUploads] = useState({
    po_peo_alignment: { name: 'BSCS_PO_PEO_AY2425.pdf', uploadedBy: 'Dr. Maria Santos', uploadDate: 'Jan 5, 2025' },
    co_po_alignment: { name: 'BSCS_CO_PO_AY2425.pdf', uploadedBy: 'Dr. Maria Santos', uploadDate: 'Jan 5, 2025' },
  });

  const completedCount = useMemo(() => Object.keys(uploads).length, [uploads]);
  const totalCount = documentDefinitions.length;
  const allComplete = completedCount === totalCount;

  const handleUpload = (key) => {
    setUploads((prev) => ({
      ...prev,
      [key]: {
        name: `BSCS_${key.toUpperCase().slice(0, 10)}_AY2425.pdf`,
        uploadedBy: 'DANILA, JUNAR',
        uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }));
  };

  const handleRemove = (key) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>PROGRAM DOCUMENTS</h1>
      </div>

      {/* Info Banner */}
      <div className={styles.infoBanner}>
        <Info size={18} className={styles.infoBannerIcon} />
        <span>These documents apply to ALL course submissions this semester. Upload once per academic period.</span>
      </div>

      {/* Upload Status Summary */}
      <h2 className={styles.sectionLabel}>Upload Status</h2>
      <div className={styles.statusGrid}>
        {documentDefinitions.map((doc) => {
          const uploaded = Boolean(uploads[doc.key]);
          return (
            <div key={doc.key} className={styles.statusCard}>
              <div className={`${styles.statusCardIconWrap} ${uploaded ? styles.statusCardIconUploaded : styles.statusCardIconPending}`}>
                {uploaded ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <p className={styles.statusCardTitle}>{doc.shortLabel}</p>
                <p className={`${styles.statusCardDate} ${uploaded ? styles.statusCardDateGreen : styles.statusCardDateOrange}`}>
                  {uploaded ? `Uploaded ${uploads[doc.key].uploadDate}` : 'Not yet uploaded'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage Documents */}
      <h2 className={styles.sectionLabel}>Manage Documents</h2>
      <div className={styles.docCardsList}>
        {documentDefinitions.map((doc) => {
          const fileData = uploads[doc.key];
          const uploaded = Boolean(fileData);

          return (
            <div key={doc.key} className={styles.docCard}>
              <h3 className={styles.docCardTitle}>{doc.title}</h3>

              <div className={`${styles.statusBadge} ${uploaded ? styles.statusBadgeUploaded : styles.statusBadgePending}`}>
                {uploaded
                  ? <><CheckCircle size={16} className={styles.statusBadgeIcon} /> Uploaded</>
                  : <><AlertTriangle size={16} className={styles.statusBadgeIcon} /> Not Uploaded</>
                }
              </div>

              {uploaded ? (
                <>
                  {/* File info */}
                  <div className={styles.fileInfoBox}>
                    <p className={styles.fileName}>{fileData.name}</p>
                    <p className={styles.fileMeta}>Uploaded by {fileData.uploadedBy} on {fileData.uploadDate}</p>
                  </div>

                  {/* Action buttons */}
                  <div className={styles.actionRow}>
                    <button className={styles.btnReplace} onClick={() => handleRemove(doc.key)}>
                      Replace File
                    </button>
                    <button className={styles.btnView}>
                      <Eye size={16} /> View
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Dropzone */}
                  <label className={styles.dropzone}>
                    <Upload size={28} className={styles.dropzoneIcon} />
                    <p className={styles.dropzoneText}>Drop file here or click to browse</p>
                    <p className={styles.dropzoneHint}>Accepted formats: PDF, DOCX</p>
                    <input
                      type="file"
                      accept=".pdf,.docx"
                      className={styles.hiddenInput}
                      onChange={() => handleUpload(doc.key)}
                    />
                  </label>

                  {/* Upload button */}
                  <button className={styles.btnUploadFull} onClick={() => handleUpload(doc.key)}>
                    Upload Now
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Warning Banner */}
      {!allComplete && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={18} className={styles.warningBannerIcon} />
          <span>Instructors cannot submit learning plans until all 3 documents are uploaded for this semester.</span>
        </div>
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

export default ProgramHeadUpload;
