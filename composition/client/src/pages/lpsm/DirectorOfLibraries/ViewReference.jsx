import { useParams, useNavigate } from 'react-router-dom';
import React from 'react';
import { ArrowLeft, Download, FileText } from 'react-feather';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import styles from '../../../styles/ViewReference.module.scss';
import { getReferenceById } from '../../../utils/referenceLibrary.js';

/* ── Same data as ReferenceLibrary (would be API in real app) ─────────── */
const SAMPLE_REFERENCES = [
  { id: 1, title: 'Introduction to Algorithms', filename: 'Cormen_Algorithms_4thEd.pdf', authors: 'Cormen, T.H., Leiserson, C.E., Rivest, R.L., Stein, C.', type: 'Book', publisher: 'MIT Press', year: 2022, isbn: '978-0-262-04630-5', edition: '4th Edition', uploadDate: '2026-05-11' },
  { id: 2, title: 'Clean Code: A Handbook of Agile Software Craftsmanship', filename: 'Martin_CleanCode.pdf', authors: 'Martin, R.C.', type: 'Book', publisher: 'Prentice Hall', year: 2008, isbn: '978-0-13-235088-4', edition: '1st Edition', uploadDate: '2026-05-10' },
  { id: 3, title: 'Data Structures and Algorithm Analysis in Java', filename: 'Weiss_DataStructures_Java.pdf', authors: 'Weiss, M.A.', type: 'Book', publisher: 'Pearson', year: 2021, isbn: '978-0-13-284737-7', edition: '3rd Edition', uploadDate: '2026-05-08' },
  { id: 4, title: 'The Art of Computer Programming, Volume 1', filename: 'Knuth_TAOCP_Vol1.pdf', authors: 'Knuth, D.E.', type: 'Book', publisher: 'Addison-Wesley', year: 2023, isbn: '978-0-201-89683-1', edition: '4th Edition', uploadDate: '2026-05-05' },
  { id: 5, title: 'Design Patterns: Elements of Reusable Object-Oriented Software', filename: 'Gamma_DesignPatterns.pdf', authors: 'Gamma, E., Helm, R., Johnson, R., Vlissides, J.', type: 'Book', publisher: 'Addison-Wesley', year: 1994, isbn: '978-0-201-63361-0', edition: '1st Edition', uploadDate: '2026-05-03' },
  { id: 6, title: 'Computer Networks', filename: 'Tanenbaum_Networks_6thEd.pdf', authors: 'Tanenbaum, A.S., Wetherall, D.J.', type: 'Book', publisher: 'Pearson', year: 2021, isbn: '978-0-13-359414-0', edition: '6th Edition', uploadDate: '2026-04-28' },
];

const ViewReference = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const ref = getReferenceById(id) || SAMPLE_REFERENCES.find((r) => r.id === parseInt(id));

  if (!ref) {
    return (
      <SkeletonA
        header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
        nav={<SideNavigation mode="director-of-libraries" />}
        content={<div style={{ padding: 30, background: 'white', height: '100%' }}>Reference not found.</div>}
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
            <span className={styles.detailValue}>{ref.type}</span>
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
      header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default ViewReference;
