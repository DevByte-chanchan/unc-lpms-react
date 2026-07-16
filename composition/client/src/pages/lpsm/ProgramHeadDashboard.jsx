import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, ChevronRight } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from '../../styles/ProgramHeadDashboard.module.scss';
import { getUnifiedSyllabi } from '../../utils/dataStore.js';

const ProgramHeadDashboard = () => {
  const [search, setSearch] = useState('');

  const syllabiData = useMemo(() => {
    return getUnifiedSyllabi().map(s => ({
      id: s.code,
      courseCode: s.code,
      courseName: s.name,
      semester: s.sem || s.semester || '—',
      program: s.code && s.code.startsWith('IT ') ? 'Information Technology' : 'Computer Science',
      documents: { peo_alignment: false, coaep: false, co_po_alignment: false },
      lastUpdated: s.update || '—'
    }));
  }, []);

  const filteredSyllabi = useMemo(() => {
    return syllabiData.filter((item) => {
      const q = search.toLowerCase();
      return item.courseCode.toLowerCase().includes(q) || item.courseName.toLowerCase().includes(q);
    });
  }, [search, syllabiData]);

  const total = syllabiData.length;
  const documentsPending = syllabiData.filter((item) => {
    const uploadedCount = Object.values(item.documents).filter(Boolean).length;
    return uploadedCount < 3;
  }).length;
  const allUploaded = total - documentsPending;

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>ASSIGNED COURSES</h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <FileText size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{total}</div>
            <div className={styles.statLabel}>Total Learning Plans</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconOrange}`}>
            <AlertCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{documentsPending}</div>
            <div className={styles.statLabel}>Documents Pending</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <CheckCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{allUploaded}</div>
            <div className={styles.statLabel}>All Docs Uploaded</div>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th width={150}>CODE</th>
              <th width={300}>COURSE NAME</th>
              <th width={130}>SEMESTER</th>
              <th width={180}>PROGRAM</th>
              <th width={120}>DOCUMENTS</th>
              <th width={150}>LAST UPDATED</th>
              <th className="fill"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSyllabi.map((item) => {
              const uploadedCount = Object.values(item.documents).filter(Boolean).length;
              const complete = uploadedCount === 3;
              return (
                <tr key={item.id}>
                  <td width={150}>{item.courseCode}</td>
                  <td width={300}>{item.courseName}</td>
                  <td width={130}>{item.semester}</td>
                  <td width={180}>{item.program}</td>
                  <td width={120}>
                    <span style={{ color: complete ? '#047857' : '#b45309', fontWeight: 500 }}>
                      {uploadedCount}/3
                    </span>
                  </td>
                  <td width={150}>{item.lastUpdated}</td>
                  <td className="fill">
                    <Link className="actionLink" to={`/lpsm/program-head/upload/${item.id}`}>
                      {complete ? 'Manage Docs' : 'Upload Docs'}
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

export default ProgramHeadDashboard;
