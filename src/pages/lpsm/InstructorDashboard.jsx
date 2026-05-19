import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, Eye, Search, Filter, ChevronRight } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from './InstructorDashboard.module.scss';

const syllabusPackages = [
  {
    id: '1',
    courseCode: 'CS 101',
    courseName: 'Introduction to Computer Science',
    semester: 'Fall 2024',
    program: 'Computer Science',
    progDocs: '3/3',
    reference: '1/1',
    overallStatus: 'Under-review',
    submittedDate: 'May 12, 2026'
  },
  {
    id: '2',
    courseCode: 'CS 201',
    courseName: 'Data Structures',
    semester: 'Fall 2024',
    program: 'Computer Science',
    progDocs: '3/3',
    reference: '1/1',
    overallStatus: 'Under-review',
    submittedDate: 'May 13, 2026'
  },
  {
    id: '3',
    courseCode: 'CS 301',
    courseName: 'Algorithms',
    semester: 'Fall 2024',
    program: 'Computer Science',
    progDocs: '2/3',
    reference: '0/1',
    overallStatus: 'Draft',
    submittedDate: '—'
  },
  {
    id: '4',
    courseCode: 'MATH 101',
    courseName: 'Calculus I',
    semester: 'Fall 2024',
    program: 'Mathematics',
    progDocs: '3/3',
    reference: '1/1',
    overallStatus: 'Approved',
    submittedDate: 'May 5, 2026'
  },
  {
    id: '5',
    courseCode: 'CS 102',
    courseName: 'Programming Fundamentals',
    semester: 'Spring 2024',
    program: 'Computer Science',
    progDocs: '3/3',
    reference: '1/1',
    overallStatus: 'Approved',
    submittedDate: 'Jan 15, 2026'
  },
  {
    id: '6',
    courseCode: 'MATH 201',
    courseName: 'Calculus II',
    semester: 'Fall 2024',
    program: 'Mathematics',
    progDocs: '3/3',
    reference: '1/1',
    overallStatus: 'Returned',
    submittedDate: 'May 1, 2026'
  }
];

const InstructorDashboard = () => {
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    return {
      total: syllabusPackages.length,
      pendingReview: syllabusPackages.filter(p => p.overallStatus === 'Under-review').length,
      underReview: syllabusPackages.filter(p => p.overallStatus === 'Under-review').length,
      approved: syllabusPackages.filter(p => p.overallStatus === 'Approved').length,
      returned: syllabusPackages.filter(p => p.overallStatus === 'Returned').length
    };
  }, []);

  const filteredPackages = useMemo(() => {
    return syllabusPackages.filter(pkg => {
      const q = search.toLowerCase();
      return pkg.courseCode.toLowerCase().includes(q) || pkg.courseName.toLowerCase().includes(q);
    });
  }, [search]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Under-review': return styles.statusUnderReview;
      case 'Approved': return styles.statusApproved;
      case 'Returned': return styles.statusReturned;
      case 'Draft': return styles.statusDraft;
      default: return styles.statusDraft;
    }
  };

  const content = (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>SYLLABUS PACKAGES REVIEW</h1>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <FileText size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Packages</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconYellow}`}>
            <AlertCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pendingReview}</div>
            <div className={styles.statLabel}>Pending Review</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <CheckCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.approved}</div>
            <div className={styles.statLabel}>Approved</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconRed}`}>
            <AlertCircle size={18} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.returned}</div>
            <div className={styles.statLabel}>Returned</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th width={150}>CODE</th>
              <th width={320}>COURSE NAME</th>
              <th width={140}>SEMESTER</th>
              <th width={150}>STATUS</th>
              <th width={150}>SUBMITTED</th>
              <th className={styles.fill}></th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.map((pkg, idx) => (
              <tr key={idx}>
                <td width={150}>{pkg.courseCode}</td>
                <td width={320}>{pkg.courseName}</td>
                <td width={140}>{pkg.semester}</td>
                <td width={150}>
                  <span className={`${styles.statusBadge} ${getStatusClass(pkg.overallStatus)}`}>
                    {pkg.overallStatus}
                  </span>
                </td>
                <td width={150}>{pkg.submittedDate}</td>
                <td className={styles.fill}>
                  <Link className="actionLink" to={`/lpsm/instructor/documents/${pkg.id}`}>
                    View Docs
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

export default InstructorDashboard;
