import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, ChevronRight } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from './DirectorDashboard.module.scss';

const directorSyllabi = [
  {
    id: '101',
    courseCode: 'CS 101',
    courseName: 'Introduction to Computer Science',
    semester: 'Fall 2024',
    program: 'Computer Science',
    documents: { references: true, resources: true },
    lastUpdated: 'May 12, 2026'
  },
  {
    id: '201',
    courseCode: 'CS 201',
    courseName: 'Data Structures',
    semester: 'Fall 2024',
    program: 'Computer Science',
    documents: { references: true, resources: false },
    lastUpdated: 'May 10, 2026'
  },
  {
    id: '301',
    courseCode: 'CS 301',
    courseName: 'Algorithms',
    semester: 'Fall 2024',
    program: 'Computer Science',
    documents: { references: false, resources: false },
    lastUpdated: 'May 8, 2026'
  },
  {
    id: '102',
    courseCode: 'CS 102',
    courseName: 'Programming Fundamentals',
    semester: 'Spring 2024',
    program: 'Computer Science',
    documents: { references: true, resources: true },
    lastUpdated: 'Jan 15, 2026'
  },
  {
    id: '101M',
    courseCode: 'MATH 101',
    courseName: 'Calculus I',
    semester: 'Fall 2024',
    program: 'Mathematics',
    documents: { references: true, resources: true },
    lastUpdated: 'May 5, 2026'
  }
];

const DirectorDashboard = () => {
  const [search, setSearch] = useState('');

  const filteredSyllabi = useMemo(() => {
    return directorSyllabi.filter((item) => {
      const q = search.toLowerCase();
      return item.courseCode.toLowerCase().includes(q) || item.courseName.toLowerCase().includes(q);
    });
  }, [search]);

  const total = directorSyllabi.length;
  const documentsPending = directorSyllabi.filter((item) => {
    const uploadedCount = Object.values(item.documents).filter(Boolean).length;
    return uploadedCount < 2;
  }).length;
  const allUploaded = total - documentsPending;

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>LIBRARY RESOURCES & REFERENCES</h1>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <FileText size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{total}</div>
            <div className={styles.statLabel}>Total Courses</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconOrange}`}>
            <AlertCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{documentsPending}</div>
            <div className={styles.statLabel}>Resources Pending</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <CheckCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{allUploaded}</div>
            <div className={styles.statLabel}>All Resources Uploaded</div>
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
              <th width={120}>RESOURCES</th>
              <th width={150}>LAST UPDATED</th>
              <th className="fill"></th>
            </tr>
          </thead>
          <tbody>
            {filteredSyllabi.map((item) => {
              const uploadedCount = Object.values(item.documents).filter(Boolean).length;
              const complete = uploadedCount === 2;
              return (
                <tr key={item.id}>
                  <td width={150}>{item.courseCode}</td>
                  <td width={300}>{item.courseName}</td>
                  <td width={130}>{item.semester}</td>
                  <td width={180}>{item.program}</td>
                  <td width={120}>
                    <span style={{ color: complete ? '#047857' : '#b45309', fontWeight: 500 }}>
                      {uploadedCount}/2
                    </span>
                  </td>
                  <td width={150}>{item.lastUpdated}</td>
                  <td className="fill">
                    <Link className="actionLink" to={`/lpsm/director-of-libraries/upload/${item.id}`}>
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
      header={<HeaderA role="Director of Libraries" name="SANTOS, MARIA" />}
      nav={<SideNavigation mode="director-of-libraries" />}
      content={content}
    />
  );
};

export default DirectorDashboard;
