import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, CheckCircle, AlertTriangle, Info, Eye } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import styles from '../../../styles/DocumentUpload.module.scss';

const uploadSlots = [
  { id: 'program_outcomes_peo_alignment', label: 'Program Outcomes & PEO Alignment', shortLabel: 'PO & PEO Alignment', acceptedTypes: '.pdf,.docx' },
  { id: 'course_outcomes_po_alignment', label: 'Course Outcomes & PO Alignment', shortLabel: 'CO & PO Alignment', acceptedTypes: '.pdf,.docx' },
  { id: 'coaep', label: 'COAEP', shortLabel: 'COAEP', acceptedTypes: '.pdf,.docx' },
];

const DocumentUpload = () => {
  const { id: planId } = useParams();

  // Simulated upload state – 2 of 3 uploaded by default
  const [uploads, setUploads] = useState({
    program_outcomes_peo_alignment: { name: 'BSCS_PO_PEO_AY2425.pdf', uploadedBy: 'Dr. Maria Santos', uploadDate: 'Jan 5, 2025' },
    course_outcomes_po_alignment: { name: 'BSCS_CO_PO_AY2425.pdf', uploadedBy: 'Dr. Maria Santos', uploadDate: 'Jan 5, 2025' },
  });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user.role) {
        localStorage.setItem('user', JSON.stringify({ ...user, role: 'program-head', name: 'DANILA, JUNAR' }));
      }
    } catch {
      localStorage.setItem('user', JSON.stringify({ role: 'program-head', name: 'DANILA, JUNAR' }));
    }
  }, []);

  const completedCount = Object.keys(uploads).length;
  const totalCount = uploadSlots.length;
  const allComplete = completedCount === totalCount;

  const handleUpload = (slotId) => {
    // Simulate uploading a file
    setUploads((prev) => ({
      ...prev,
      [slotId]: {
        name: `BSCS_${slotId.toUpperCase().slice(0, 10)}_AY2425.pdf`,
        uploadedBy: 'DANILA, JUNAR',
        uploadDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      }
    }));
  };

  const handleRemove = (slotId) => {
    setUploads((prev) => {
      const next = { ...prev };
      delete next[slotId];
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
        {uploadSlots.map((slot) => {
          const uploaded = Boolean(uploads[slot.id]);
          return (
            <div key={slot.id} className={styles.statusCard}>
              <div className={`${styles.statusCardIconWrap} ${uploaded ? styles.statusCardIconUploaded : styles.statusCardIconPending}`}>
                {uploaded ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                <p className={styles.statusCardTitle}>{slot.shortLabel}</p>
                <p className={`${styles.statusCardDate} ${uploaded ? styles.statusCardDateGreen : styles.statusCardDateOrange}`}>
                  {uploaded ? `Uploaded ${uploads[slot.id].uploadDate}` : 'Not yet uploaded'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage Documents */}
      <h2 className={styles.sectionLabel}>Manage Documents</h2>
      <div className={styles.docCardsList}>
        {uploadSlots.map((slot) => {
          const fileData = uploads[slot.id];
          const uploaded = Boolean(fileData);

          return (
            <div key={slot.id} className={styles.docCard}>
              <h3 className={styles.docCardTitle}>{slot.label}</h3>

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
                    <button className={styles.btnReplace} onClick={() => handleRemove(slot.id)}>
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
                      accept={slot.acceptedTypes}
                      className={styles.hiddenInput}
                      onChange={() => handleUpload(slot.id)}
                    />
                  </label>

                  {/* Upload button */}
                  <button className={styles.btnUploadFull} onClick={() => handleUpload(slot.id)}>
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

export default DocumentUpload;
