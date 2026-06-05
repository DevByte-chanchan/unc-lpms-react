import React, { useState } from 'react';
import styles from '../../../styles/PDFExportPanel.module.scss';
import * as service from '../../../services/learningPlanService';

const PDFExportPanel = ({ planId, courseCode, courseName, status, role, userId }) => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleExportPDF = async () => {
    try {
      setError(null);
      setSuccess(null);
      setExporting(true);

      const response = await service.exportPDF(role, userId, planId);

      // Create blob URL and download
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute(
        'download',
        `LP_${courseCode || planId}_${new Date().toISOString().split('T')[0]}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      setSuccess('PDF exported successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to export PDF';
      setError(errorMsg);
    } finally {
      setExporting(false);
    }
  };

  const isApproved = status === 'approved';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>📄 Export to PDF</h3>
        <p className={styles.subtitle}>Generate a formatted PDF document of this learning plan</p>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      <div className={styles.content}>
        <div className={styles.info}>
          <p className={styles.courseName}>
            <strong>{courseName || 'Learning Plan'}</strong>
          </p>
          <p className={styles.courseCode}>Code: {courseCode || 'N/A'}</p>
          <p className={styles.status}>
            Status:{' '}
            <span className={styles[`status_${status}`]}>
              {status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </p>
        </div>

        <div className={styles.details}>
          <ul>
            <li>✓ Includes course information</li>
            <li>✓ Shows all uploaded documents</li>
            <li>✓ Displays approval trail</li>
            <li>✓ Professional UNC branding</li>
          </ul>
        </div>

        {!isApproved && (
          <div className={styles.warningBox}>
            <p>
              ⚠️ <strong>Note:</strong> Only approved learning plans are recommended for official
              export.
            </p>
          </div>
        )}

        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className={`${styles.exportButton} ${exporting ? styles.loading : ''}`}
        >
          {exporting ? (
            <>
              <span className={styles.spinner}>⌛</span>
              Generating PDF...
            </>
          ) : (
            <>
              <span>📥 Download PDF</span>
            </>
          )}
        </button>
      </div>

      <div className={styles.footer}>
        <p>Your PDF will be downloaded automatically to your device.</p>
      </div>
    </div>
  );
};

export default PDFExportPanel;
