import { useParams, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import styles from '../../../styles/ViewReference.module.scss';
import { loadReference, loadReferenceTypes } from '../../../utils/referenceStore.js';
import { typeLabel } from '../../../utils/referenceCatalog.js';


const ViewReference = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ref, setRef] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let live = true;
    loadReferenceTypes()
      .then(() => loadReference(id))
      .then(found => { if (live) { setRef(found); setState(found ? 'ready' : 'missing'); } })
      .catch(() => { if (live) setState('missing'); });
    return () => { live = false; };
  }, [id]);

  if (!ref) {
    return (
      <SkeletonA
        header={<HeaderA role="Director of Libraries" />}
        nav={<SideNavigation mode="director-of-libraries" />}
        content={<div style={{ padding: 30, background: 'white', height: '100%' }}>{state === 'loading' ? 'Loading…' : 'Reference not found.'}</div>}
      />
    );
  }

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>REFERENCE DETAILS</h1>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>TITLE</span>
          <span className={styles.detailValue}>{ref.title}</span>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>AUTHORS</span>
          <span className={styles.detailValue}>{ref.authors}</span>
        </div>
        <div className={styles.detailRow2col}>
          <div>
            <span className={styles.detailLabel}>REFERENCE TYPE</span>
            <span className={styles.detailValue}>{typeLabel(ref.type)}</span>
          </div>
          <div>
            <span className={styles.detailLabel}>PUBLICATION YEAR</span>
            <span className={styles.detailValue}>{ref.year}</span>
          </div>
        </div>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>PUBLISHER</span>
          <span className={styles.detailValue}>{ref.publisher || '—'}</span>
        </div>
        <div className={styles.detailRow2col}>
          <div>
            <span className={styles.detailLabel}>ISBN / DOI</span>
            <span className={styles.detailValue}>{ref.isbn || '—'}</span>
          </div>
          <div>
            <span className={styles.detailLabel}>EDITION</span>
            <span className={styles.detailValue}>{ref.edition || '—'}</span>
          </div>
        </div>
        {(ref.departments || []).length > 0 && (
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>DEPARTMENT</span>
            <span className={styles.detailValue}>{(ref.departments || []).join(', ')}</span>
          </div>
        )}

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>UPLOAD DATE</span>
          <span className={styles.detailValue}>
            {ref.uploadDate
              ? new Date(ref.uploadDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : '—'}
          </span>
        </div>

        {/* File */}
        <div className={styles.fileSection}>
          <span className={styles.detailLabel}>UPLOADED FILE</span>
          <div className={styles.fileCard}>
            <FileText size={20} />
            <span className={styles.fileName}>{ref.filename}</span>
            <button className={styles.downloadBtn} type="button">
              <Download size={16} />
              Download
            </button>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.btnBack} type="button" onClick={() => navigate('/role/director-of-libraries/reference-library')}>
          <ArrowLeft size={16} />
          Back to Library
        </button>
        <button className={styles.btnEdit} type="button" onClick={() => navigate(`/role/director-of-libraries/edit-reference/${ref.id}`)}>
          Edit Reference
        </button>
      </div>
    </div>
  );

  return (
    <SkeletonA
      header={<HeaderA role="Director of Libraries" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default ViewReference;
