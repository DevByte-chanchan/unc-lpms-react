import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, ChevronRight, Download } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from './InstructorDashboard.module.scss';
import { syllabiData, getSyllabusByCode } from '../../data/syllabiData.js';
import { getWorkflow } from '../../utils/workflowHelpers.js';
import { exportSyllabusToPDF } from '../../utils/pdfExport.js';

// One-time fix: normalize all instructor names in localStorage
(function fixInstructorNames() {
  const FLAG = 'lpsm_instructor_fix_v2'
  if (localStorage.getItem(FLAG)) return
  try {
    const raw = localStorage.getItem('lpms_syllabi_v1')
    if (raw) {
      const data = JSON.parse(raw)
      let changed = false
      data.forEach(s => {
        if (!s.instructor || s.instructor.toLowerCase().includes('norton') || s.instructor.toLowerCase().includes('monica')) {
          s.instructor = 'CASIMERO, DANNY'
          changed = true
        }
      })
      if (changed) localStorage.setItem('lpms_syllabi_v1', JSON.stringify(data))
    }
  } catch (e) {}
  localStorage.setItem(FLAG, '1')
})()

const InstructorDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [tick, setTick] = useState(0);

  const initialTab = searchParams.get('tab') || 'drafted';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'drafted', label: 'DRAFTED COURSES', statuses: ['DRAFT'] },
    { id: 'assigned', label: 'ASSIGNED COURSES', statuses: ['PENDING', 'RETURNED'] },
    { id: 'approved', label: 'APPROVED COURSES', statuses: ['APPROVED'] },
  ];

  const courses = useMemo(() => {
    return syllabiData.map(s => {
      const wf = getWorkflow(s.code);
      const stage = wf.currentStage || 'submitted';
      let overallStatus = 'Draft';
      if (stage === 'approved') overallStatus = 'APPROVED';
      else if (stage === 'returned') overallStatus = 'RETURNED';
      else if (stage === 'submitted') overallStatus = 'DRAFT';
      else overallStatus = 'Under-review';

      const submittedDate = wf.submittedAt
        ? new Date(wf.submittedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : '—';

      const approvedDate = wf.dean?.completedAt
        ? new Date(wf.dean.completedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : '';

      return {
        code: s.code,
        name: s.name,
        semester: `${s.year || ''} ${s.sem || ''}`.trim() || '—',
        overallStatus,
        submittedDate,
        approvedDate,
      };
    });
  }, [tick]);

  const filteredByTab = useMemo(() => {
    const tab = tabs.find(t => t.id === activeTab);
    return courses.filter(c => tab && tab.statuses.includes(c.overallStatus));
  }, [activeTab, courses]);

  const stats = useMemo(() => {
    return {
      total: courses.length,
      pendingReview: courses.filter(p => p.overallStatus === 'Under-review').length,
      approved: courses.filter(p => p.overallStatus === 'APPROVED').length,
      returned: courses.filter(p => p.overallStatus === 'RETURNED').length
    };
  }, [courses]);

  const filteredPackages = useMemo(() => {
    return filteredByTab.filter(pkg => {
      const q = search.toLowerCase();
      return pkg.code.toLowerCase().includes(q) || pkg.name.toLowerCase().includes(q);
    });
  }, [search, filteredByTab]);

  const getStatusClass = (status) => {
    switch (status) {
      case 'Under-review': return styles.statusUnderReview;
      case 'APPROVED': return styles.statusApproved;
      case 'RETURNED': return styles.statusReturned;
      case 'DRAFT': return styles.statusDraft;
      default: return styles.statusDraft;
    }
  };

  const generatePDF = (course) => {
    const syllabus = getSyllabusByCode(course.code);
    if (syllabus) exportSyllabusToPDF(syllabus, course.code);
  };

  const content = (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 key={activeTab}>{activeTab === 'drafted' ? 'DRAFTED COURSES' : activeTab === 'assigned' ? 'ASSIGNED COURSES' : 'APPROVED COURSES'}</h1>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchParams({ tab: tab.id }); }}
            style={{
              padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              border: 'none', borderBottom: activeTab === tab.id ? '2px solid #1e3a5f' : '2px solid transparent',
              background: 'transparent', color: activeTab === tab.id ? '#1e3a5f' : '#6b7280',
              marginBottom: -2, transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      <div className={styles.tableWrapper}>
        <table>
          <thead>
            <tr>
              <th width={150}>CODE</th>
              <th width={320}>COURSE NAME</th>
              <th width={140}>SEMESTER</th>
              <th width={150}>STATUS</th>
              <th width={150}>{activeTab === 'approved' ? 'DATE APPROVED' : 'SUBMITTED'}</th>
              {activeTab === 'approved' && <th width={120}>EXPORT</th>}
              <th className={styles.fill}></th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.length === 0 ? (
              <tr><td colSpan={activeTab === 'approved' ? 7 : 6} style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>No {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} found.</td></tr>
            ) : (filteredPackages.map((pkg, idx) => (
              <tr key={idx}>
                <td width={150}>{pkg.code}</td>
                <td width={320}>{pkg.name}</td>
                <td width={140}>{pkg.semester}</td>
                <td width={150}>
                  <span className={`${styles.statusBadge} ${getStatusClass(pkg.overallStatus)}`}>
                    {pkg.overallStatus === 'APPROVED' ? 'Approved' : pkg.overallStatus === 'RETURNED' ? 'Returned' : pkg.overallStatus}
                  </span>
                </td>
                <td width={150}>{activeTab === 'approved' ? pkg.approvedDate : pkg.submittedDate}</td>
                {activeTab === 'approved' && (
                  <td width={120}>
                    <button
                      onClick={() => generatePDF(pkg)}
                      className={'actionLink'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Export <Download size={18} />
                    </button>
                  </td>
                )}
                <td className={styles.fill}>
                  <Link className="actionLink" to={`/role/instructor/courses/${encodeURIComponent(pkg.code)}`} state={{ fromTab: activeTab }}>
                    View
                    <ChevronRight size={18} />
                  </Link>
                </td>
              </tr>
            )))}
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
