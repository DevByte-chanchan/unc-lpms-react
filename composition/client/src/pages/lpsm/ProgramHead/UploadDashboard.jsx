import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, Search, Filter, ChevronRight } from 'react-feather';
import styles from '../../../styles/UploadDashboard.module.scss';
import SkeletonA from '../../../layouts/SkeletonA.jsx';
import HeaderA from '../../../components/HeaderA.jsx';
import SideNavigation from '../../../components/SideNavigation.jsx';
import * as service from '../../../services/learningPlanService';

/* ── Sample fallback data matching the screenshot ─────────────────────── */
const SAMPLE_DATA = [
  {
    id: 1,
    code: 'CS 101',
    course_name: 'Introduction to Computer Science',
    semester: 'Fall 2024',
    program: 'Computer Science',
    documents: [
      { document_type: 'peo_alignment' },
      { document_type: 'coaep' },
      { document_type: 'co_po_alignment' },
    ],
    updated_at: '2026-05-12',
  },
  {
    id: 2,
    code: 'CS 201',
    course_name: 'Data Structures',
    semester: 'Fall 2024',
    program: 'Computer Science',
    documents: [
      { document_type: 'peo_alignment' },
      { document_type: 'coaep' },
    ],
    updated_at: '2026-05-10',
  },
  {
    id: 3,
    code: 'CS 301',
    course_name: 'Algorithms',
    semester: 'Fall 2024',
    program: 'Computer Science',
    documents: [],
    updated_at: '2026-05-08',
  },
  {
    id: 4,
    code: 'MATH 101',
    course_name: 'Calculus I',
    semester: 'Fall 2024',
    program: 'Mathematics',
    documents: [
      { document_type: 'peo_alignment' },
      { document_type: 'coaep' },
      { document_type: 'co_po_alignment' },
    ],
    updated_at: '2026-05-05',
  },
  {
    id: 5,
    code: 'CS 102',
    course_name: 'Programming Fundamentals',
    semester: 'Spring 2024',
    program: 'Computer Science',
    documents: [
      { document_type: 'peo_alignment' },
      { document_type: 'coaep' },
      { document_type: 'co_po_alignment' },
    ],
    updated_at: '2026-01-15',
  },
];

const REQUIRED_TYPES = ['peo_alignment', 'coaep', 'co_po_alignment'];

const UploadDashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const userId = parseInt(localStorage.getItem('userId') || '10');
  const role = 'program_head';

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await service.getLearningPlans(role, userId);
        const data = res.data && res.data.length > 0 ? res.data : SAMPLE_DATA;
        setPlans(data);
      } catch {
        // Use sample data when backend is unavailable
        setPlans(SAMPLE_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  /* ── Helpers ─────────────────────────────────────────────────────────── */

  const getDocumentStatus = (plan) => {
    const docs = plan.documents || [];
    const uploaded = docs.filter((d) => REQUIRED_TYPES.includes(d.document_type));
    const completed = uploaded.length;
    const total = REQUIRED_TYPES.length;
    return { completed, total, isComplete: completed === total };
  };

  const stats = useMemo(() => {
    let pending = 0;
    let completed = 0;
    plans.forEach((plan) => {
      const { isComplete } = getDocumentStatus(plan);
      if (isComplete) completed++;
      else pending++;
    });
    return { total: plans.length, pending, completed };
  }, [plans]);

  const filteredPlans = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return plans;
    return plans.filter(
      (p) =>
        (p.code || '').toLowerCase().includes(term) ||
        (p.course_name || '').toLowerCase().includes(term)
    );
  }, [plans, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPlans.length / itemsPerPage));
  const paginatedPlans = filteredPlans.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const showingFrom = filteredPlans.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const showingTo = Math.min(currentPage * itemsPerPage, filteredPlans.length);

  const handleUploadClick = (planId) => {
    navigate(`/role/program-head/upload-documents/${planId}`);
  };

  /* ── Render ──────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <SkeletonA
        header={<HeaderA role="Program Head" name="DANILA, JUNAR" />}
        nav={<SideNavigation mode="program-head" />}
        content={<div className={styles.container}><p>Loading...</p></div>}
      />
    );
  }

  const content = (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>ASSIGNED COURSES</h1>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <FileText size={22} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Learning Plans</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconOrange}`}>
            <AlertCircle size={22} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.pending}</div>
            <div className={styles.statLabel}>Documents Pending</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <CheckCircle size={22} />
          </div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.completed}</div>
            <div className={styles.statLabel}>All Documents Uploaded</div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className={styles.controlsBar}>
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIconSvg} />
          <input
            type="text"
            placeholder="Search by course code or name..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.filterBtn} type="button">
          <Filter size={16} />
          <span>Filter</span>
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Table */}
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
            {paginatedPlans.length > 0 ? (
              paginatedPlans.map((plan) => {
                const { completed, total, isComplete } = getDocumentStatus(plan);
                return (
                  <tr key={plan.id}>
                    <td width={150} className={styles.courseCode}>{plan.code || 'N/A'}</td>
                    <td width={300}>{plan.course_name}</td>
                    <td width={130}>{plan.semester || 'N/A'}</td>
                    <td width={180}>{plan.program || 'N/A'}</td>
                    <td width={120}>
                      <div className={styles.docStatus}>
                        <span className={`${styles.statusText} ${isComplete ? styles.complete : styles.pending}`}>
                          {completed}/{total}
                        </span>
                        {isComplete ? (
                          <CheckCircle size={16} className={styles.statusIconGreen} />
                        ) : (
                          <AlertCircle size={16} className={styles.statusIconOrange} />
                        )}
                      </div>
                    </td>
                    <td width={150}>
                      {plan.updated_at
                        ? new Date(plan.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </td>
                    <td className="fill">
                      <button
                        onClick={() => handleUploadClick(plan.id)}
                        className={`${styles.actionLink} ${isComplete ? styles.manage : styles.upload}`}
                      >
                        {isComplete ? 'Manage Docs' : 'Upload Docs'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className={styles.noData}>
                  No learning plans found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={styles.pagination}>
        <span className={styles.paginationInfo}>
          Showing {showingFrom}-{showingTo} of {filteredPlans.length} learning plans
        </span>
        <div className={styles.paginationButtons}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              className={`${styles.pageBtn} ${page === currentPage ? styles.pageBtnActive : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
        </div>
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

export default UploadDashboard;
