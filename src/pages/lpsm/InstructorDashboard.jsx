import { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle, ChevronRight, Download } from 'react-feather';
import SkeletonA from '../../layouts/SkeletonA.jsx';
import HeaderA from '../../components/HeaderA.jsx';
import SideNavigation from '../../components/SideNavigation.jsx';
import styles from '../../styles/InstructorDashboard.module.scss';
import { syllabiData, getSyllabusByCode } from '../../data/syllabiData.js';
import { getWorkflow } from '../../utils/workflowHelpers.js';
import PDFViewerModal from '../../components/PDFViewerModal'

const getProgram = (code) => {
  if (code && code.startsWith('IT ')) return 'Information Technology';
  return 'Computer Science';
};

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

      const lastUpdated = s.update || 'TBA';

      return {
        code: s.code,
        name: s.name,
        program: getProgram(s.code),
        lastUpdated,
        overallStatus,
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

  const getStatusLabel = (status) => {
    if (status === 'APPROVED') return 'Approved';
    if (status === 'RETURNED') return 'Returned';
    if (status === 'Under-review') return 'Under Review';
    return 'Draft';
  };

  const openPreview = (course) => {
    const syllabus = getSyllabusByCode(course.code);
    if (!syllabus) return
    setPreviewFile({
      file_url: '/syllabus-template.pdf',
      file_name: `LearningPlan_${course.code}.pdf`,
      instructor_name: syllabus.instructor || '—',
      course_id: course.code,
      course_name: course.name,
      submission_date: syllabus.update || '',
      period_label: (syllabus.year || '') + ' — ' + (syllabus.sem || ''),
    })
  };

  const getReviewerStatuses = (code) => {
    const wf = getWorkflow(code);
    const stage = wf.currentStage || 'submitted';

    const mapStatus = (raw, activeStages) => {
      if (raw === 'done') return 'approved';
      if (raw === 'returned') return 'returned';
      return activeStages ? 'pending' : 'waiting';
    };

    const icStatus = mapStatus(wf.parallelReview?.industry_consultant?.status, stage === 'parallel_review' || stage === 'program_head' || stage === 'dean' || stage === 'approved');
    const libStatus = mapStatus(wf.parallelReview?.library_director?.status, stage === 'parallel_review' || stage === 'program_head' || stage === 'dean' || stage === 'approved');
    const phStatus = mapStatus(wf.programHead?.status, stage === 'program_head');
    const deanStatus = mapStatus(wf.dean?.status, stage === 'dean');

    return [
      { role: 'Industry Consultant',    name: 'Roberto Cruz',   status: icStatus,   completedAt: wf.parallelReview?.industry_consultant?.completedAt || null },
      { role: 'Director of Libraries',  name: 'Maria Santos',   status: libStatus,  completedAt: wf.parallelReview?.library_director?.completedAt || null },
      { role: 'Program Head',           name: 'Junar Danila',   status: phStatus,   completedAt: wf.programHead?.completedAt || null },
      { role: 'Dean',                   name: 'Agnes Reyes',    status: deanStatus, completedAt: wf.dean?.completedAt || null },
    ];
  };

  const getReviewStatusLabel = (status) => {
    if (status === 'approved') return 'Approved';
    if (status === 'pending') return 'Pending';
    if (status === 'returned') return 'Returned';
    return '\u2014';
  };

  const [statusPopup, setStatusPopup] = useState(null);
  const [popupPos, setPopupPos] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const content = (
    <><div className={styles.container}>
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
              <th width={180}>CODE</th>
              <th width={340}>COURSE NAME</th>
              <th width={180}>PROGRAM</th>
              <th width={180}>LAST UPDATED</th>
              {activeTab === 'approved' && <th width={100}>EXPORT</th>}
              <th className={styles.fill}></th>
            </tr>
          </thead>
          <tbody>
            {filteredPackages.length === 0 ? (
              <tr><td colSpan={activeTab === 'approved' ? 6 : 5} style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' }}>No {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} found.</td></tr>
            ) : (filteredPackages.map((pkg, idx) => (
              <tr key={idx}>
                <td width={180}>{pkg.code}</td>
                <td width={340}>{pkg.name}</td>
                <td width={180}>{pkg.program}</td>
                <td width={180}>{pkg.lastUpdated}</td>
                {activeTab === 'approved' && (
                  <td width={100}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <button
                        onClick={() => openPreview(pkg)}
                        className={'actionLink'}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: 13, fontWeight: 500, color: '#111827' }}
                      >
                        Export <Download size={16} />
                      </button>
                    </div>
                  </td>
                )}
                <td className={styles.fill}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <Link className="actionLink" to={`/role/instructor/courses/${encodeURIComponent(pkg.code)}`} state={{ fromTab: activeTab }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#111827' }}
                    >
                      View
                      <ChevronRight size={16} />
                    </Link>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); setPopupPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right }); setStatusPopup(statusPopup === pkg.code ? null : pkg.code); }}
                        style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: '#f1f5f9', border: '1px solid #cbd5e1',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 0, color: '#64748b', fontSize: 14, fontWeight: 700,
                        }}
                        title="View approval status"
                      >
                        ?
                      </button>
                      {statusPopup === pkg.code && popupPos && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => { setStatusPopup(null); setPopupPos(null); }} />
                      )}
                    </div>
                  </div>
                  </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>
    </div>
    {statusPopup && popupPos && (
      <div
        style={{
          position: 'fixed', top: popupPos.top, right: popupPos.right, marginTop: 0,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 9999,
          padding: '12px 0', minWidth: 220,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '0 14px 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0' }}>
          Approval Chain
        </div>
        {getReviewerStatuses(statusPopup).map((r, i) => (
          <div key={i} style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
            <div style={{ fontSize: 11, color: '#64748B' }}>{r.role}</div>
            <div style={{ fontSize: 12, marginTop: 2 }}>
              {r.status === 'approved' ? <span style={{ color: '#047857' }}>Approved at: {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</span> : null}
              {r.status === 'returned' ? <span style={{ color: '#dc2626' }}>Returned at: {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}</span> : null}
              {r.status === 'pending' || r.status === 'waiting' ? <span style={{ color: '#999' }}>Pending</span> : null}
            </div>
          </div>
        ))}
        <div style={{ padding: '8px 14px 0', borderTop: '1px solid #e2e8f0', marginTop: 4, paddingTop: 8 }}>
          <button
            onClick={() => { setStatusPopup(null); setPopupPos(null); }}
            style={{ width: '100%', padding: '6px 0', background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    )}
    {previewFile && (
      <PDFViewerModal
        file={previewFile}
        kind="Learning Plan"
        onClose={() => setPreviewFile(null)}
        onExport={(f) => {
          const a = document.createElement('a')
          a.href = f.file_url
          a.download = f.file_name
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        }}
      />
    )}
  </>
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
