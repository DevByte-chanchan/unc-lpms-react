import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../../styles/OICOVPAADashboard.module.scss';
import * as service from '../../../services/learningPlanService';
import * as syllabusService from '../../../services/syllabusService';
import { getSyllabi } from '../../../utils/dataStore';
import { exportSyllabusToPDF } from '../../../utils/pdfExport';
import { FileText, Clipboard } from 'react-feather';
import {
  StatusBadge, DeanEmptyState, ActionButton, fmtDate
} from './dashboardHelpers';
import SyllabusVersionHistory from './SyllabusVersionHistory';

const OICOVPAADashboard = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('syllabi');
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPlans, setSelectedPlans] = useState(new Set());
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [syllabiStatusFilter, setSyllabiStatusFilter] = useState('all');
  const [refreshKey, setRefreshKey] = useState(0);
  const [syllabusApprovals, setSyllabusApprovals] = useState([]);
  const [versionHistoryTarget, setVersionHistoryTarget] = useState(null);

  const userId = parseInt(localStorage.getItem('userId') || '40');
  const role = 'oic_ovpaa';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchApprovedPlans();
    fetchSyllabusApprovals();
  }, [refreshKey]);

  const fetchApprovedPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await service.getLearningPlans(role, userId, { status: 'approved' });
      setPlans(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load learning plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyllabusApprovals = async () => {
    try {
      const res = await syllabusService.listApprovals(role, userId);
      setSyllabusApprovals(res.data || []);
    } catch (err) {
      console.error('Failed to load syllabus approvals:', err);
    }
  };

  const syllabusWorkflows = useMemo(() => {
    const syllabi = getSyllabi();
    return syllabusApprovals.map(sa => {
      const syllabus = syllabi.find(s => s.code === sa.course_code);
      return {
        code: sa.course_code,
        courseName: sa.course_name || syllabus?.name || syllabus?.courseName || syllabus?.course || sa.course_code,
        workflow: {
          currentStage: sa.current_stage,
          submittedAt: sa.submitted_at,
          oicOvpaa: sa.oic_status === 'pending' ? null : {
            status: sa.oic_status,
            completedAt: sa.oic_reviewed_at
          }
        },
        syllabus: syllabus || null
      };
    });
  }, [syllabusApprovals]);

  const pendingApprovals = useMemo(() => {
    return syllabusWorkflows.filter(s => {
      const stage = s.workflow.currentStage;
      return stage === 'dean' || stage === 'program_head' || stage === 'parallel_review';
    }).sort((a, b) => {
      const stageOrder = { dean: 0, program_head: 1, parallel_review: 2 };
      return (stageOrder[a.workflow.currentStage] || 99) - (stageOrder[b.workflow.currentStage] || 99);
    });
  }, [syllabusWorkflows]);

  const nonDraftSyllabi = useMemo(() => {
    return syllabusWorkflows.filter(s => s.workflow.currentStage !== 'submitted');
  }, [syllabusWorkflows]);

  const approvedSyllabi = useMemo(() => {
    return nonDraftSyllabi.filter(s => s.workflow.currentStage === 'approved');
  }, [nonDraftSyllabi]);

  const inReviewSyllabi = useMemo(() => {
    return nonDraftSyllabi.filter(s =>
      s.workflow.currentStage !== 'approved' && s.workflow.currentStage !== 'returned'
    );
  }, [nonDraftSyllabi]);

  const returnedSyllabi = useMemo(() => {
    return nonDraftSyllabi.filter(s => s.workflow.currentStage === 'returned');
  }, [nonDraftSyllabi]);

  const approvedCount = useMemo(() =>
    syllabusWorkflows.filter(s => s.workflow.currentStage === 'approved').length,
  [syllabusWorkflows]);

  const returnedCount = useMemo(() =>
    syllabusWorkflows.filter(s => s.workflow.currentStage === 'returned').length,
  [syllabusWorkflows]);

  const facultyStats = useMemo(() => {
    const stats = {};
    syllabusWorkflows.forEach(s => {
      const instructor = s.syllabus?.instructor || 'Unknown';
      if (!stats[instructor]) {
        stats[instructor] = { total: 0, approved: 0, pending: 0, returned: 0 };
      }
      stats[instructor].total++;
      if (s.workflow.currentStage === 'approved') stats[instructor].approved++;
      else if (s.workflow.currentStage === 'returned') stats[instructor].returned++;
      else stats[instructor].pending++;
    });
    return stats;
  }, [syllabusWorkflows]);

  const localApprovedPlans = useMemo(() => {
    const syllabi = getSyllabi();
    return syllabusApprovals
      .filter(sa => sa.oic_status === 'approved')
      .map(sa => {
        const syllabus = syllabi.find(s => s.code === sa.course_code);
        return {
          id: sa.course_code,
          course_code: sa.course_code,
          course_name: sa.course_name || syllabus?.name || syllabus?.courseName || sa.course_code,
          instructor: { name: sa.instructor_name || syllabus?.instructor || 'Unknown' },
          academic_year: sa.academic_year || syllabus?.academicYear || syllabus?.schoolYear || '2024-2025',
          semester: sa.semester || syllabus?.semester || (syllabus?.sem ? syllabus.sem.replace(' Semester', '') : '1st'),
          updated_at: sa.oic_reviewed_at || sa.updated_at,
          status: 'approved'
        };
      });
  }, [syllabusApprovals]);

  const filteredPlans = localApprovedPlans.filter(plan => {
    const matchesSearch = !searchTerm ||
      plan.course_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plan.course_code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = semesterFilter === 'all' || plan.semester === semesterFilter;
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    return matchesSearch && matchesSemester && matchesStatus;
  });

  const handleSelectPlan = (planId) => {
    setSelectedPlans(prev => {
      const next = new Set(prev);
      if (next.has(planId)) next.delete(planId);
      else next.add(planId);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlans.size === filteredPlans.length) {
      setSelectedPlans(new Set());
    } else {
      setSelectedPlans(new Set(filteredPlans.map(p => p.id)));
    }
  };

  const handleBatchExport = async () => {
    if (selectedPlans.size === 0) {
      showToast('Please select at least one learning plan', 'warning');
      return;
    }
    try {
      setExporting(true);
      let exported = 0;
      for (const id of selectedPlans) {
        const item = syllabusWorkflows.find(w => w.code === id);
        if (item) {
          exportSyllabusToPDF(item.syllabus || item, item.workflow);
          exported++;
        }
      }
      setSelectedPlans(new Set());
      showToast(`Exported ${exported} syllabus/s successfully!`);
    } catch {
      showToast('Failed to export some PDFs', 'warning');
    } finally {
      setExporting(false);
    }
  };

  const handleApproveSyllabus = async (code) => {
    try {
      await syllabusService.approveSyllabus(role, userId, code, { comments: '' });
      setRefreshKey(k => k + 1);
      showToast(`Syllabus ${code} approved successfully!`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve syllabus', 'warning');
    }
  };

  const handleReturnSyllabus = async (code) => {
    try {
      const msg = prompt('Enter reason for returning:');
      if (msg === null) return;
      await syllabusService.returnSyllabus(role, userId, code, { comments: msg || '' });
      setRefreshKey(k => k + 1);
      showToast(`Syllabus ${code} returned for revision.`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to return syllabus', 'warning');
    }
  };

  const handleExportPdf = (item) => {
    try {
      if (!item.syllabus) {
        showToast('Syllabus data not available for export', 'warning');
        return;
      }
      exportSyllabusToPDF(item.syllabus, item.code, item.workflow);
      showToast('PDF exported successfully!');
    } catch (e) {
      showToast(e.message || 'Failed to export PDF', 'warning');
    }
  };

  const renderToast = () => {
    if (!toast) return null;
    return (
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        padding: '14px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
        background: toast.type === 'success' ? '#d5f4e6' : toast.type === 'warning' ? '#fef5e7' : '#fee',
        color: toast.type === 'success' ? '#27ae60' : toast.type === 'warning' ? '#f39c12' : '#e74c3c',
        borderLeft: `4px solid ${toast.type === 'success' ? '#27ae60' : toast.type === 'warning' ? '#f39c12' : '#e74c3c'}`,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        {toast.msg}
      </div>
    );
  };

  const syllabiForTab = useMemo(() => {
    if (syllabiStatusFilter === 'all') return nonDraftSyllabi;
    if (syllabiStatusFilter === 'approved') return approvedSyllabi;
    return nonDraftSyllabi;
  }, [syllabiStatusFilter, nonDraftSyllabi, approvedSyllabi]);

  const effectiveSyllabiList = syllabiForTab;

  return (
    <div className={styles.container}>
      {renderToast()}

      <div className={styles.header}>
        <div>
          <h1>APPROVED COURSES</h1>
          <p className={styles.subtitle}>Finalized and validated syllabi (locked/official version)</p>
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      <div className={styles.tabNav}>
        {[
          { id: 'overview', label: 'Overview', icon: '📊' },
          { id: 'syllabi', label: `Syllabi (${nonDraftSyllabi.length})`, icon: '📋' },
          { id: 'pending', label: `Pending (${pendingApprovals.length})`, icon: '⏳' },
          { id: 'plans', label: `Approved Plans (${localApprovedPlans.length})`, icon: '📚' },
          { id: 'faculty', label: 'Faculty Overview', icon: '👨‍🏫' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#ebf5fb', color: '#3498db' }}>📋</div>
              <div className={styles.statNumber}>{syllabusWorkflows.length}</div>
              <div className={styles.statLabel}>Total Syllabi</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#fef5e7', color: '#f39c12' }}>⏳</div>
              <div className={styles.statNumber}>{pendingApprovals.length}</div>
              <div className={styles.statLabel}>Pending Review</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#d5f4e6', color: '#27ae60' }}>✅</div>
              <div className={styles.statNumber}>{approvedCount}</div>
              <div className={styles.statLabel}>Approved</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#fadbd8', color: '#e74c3c' }}>🔄</div>
              <div className={styles.statNumber}>{returnedCount}</div>
              <div className={styles.statLabel}>Returned</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#f3e8ff', color: '#7c3aed' }}>📚</div>
              <div className={styles.statNumber}>{plans.length}</div>
              <div className={styles.statLabel}>Approved LP Plans</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: '#e0f2fe', color: '#0284c7' }}>👨‍🏫</div>
              <div className={styles.statNumber}>{Object.keys(facultyStats).length}</div>
              <div className={styles.statLabel}>Faculty Contributors</div>
            </div>
          </div>

          <div className={styles.twoColumn}>
            <div className={styles.columnCard}>
              <div className={styles.cardHeader}>
                <h3>Pending Syllabus Approvals</h3>
                {pendingApprovals.length > 0 && (
                  <button onClick={() => setActiveTab('pending')} className={styles.viewAll}>View All →</button>
                )}
              </div>
              {pendingApprovals.length === 0 ? (
                <DeanEmptyState icon={Clipboard} title="No pending approvals" description="All syllabi have been reviewed. No items pending at this time." />
              ) : (
                <div className={styles.pendingList}>
                  {pendingApprovals.slice(0, 5).map(item => (
                    <div key={item.code} className={styles.pendingItem}>
                      <div className={styles.pendingInfo}>
                        <strong>{item.code}</strong>
                        <span className={styles.pendingCourse}>{item.courseName}</span>
                      </div>
                      <div className={styles.pendingMeta}>
                        <StatusBadge stage={item.workflow.currentStage} />
                        <span style={{ fontSize: 11, color: '#7f8c8d' }}>{fmtDate(item.workflow.submittedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className={styles.columnCard}>
              <div className={styles.cardHeader}>
                <h3>Recent Activity</h3>
              </div>
              <DeanEmptyState icon={Clipboard} title="No recent activity" description="Activity log will appear here once actions are performed." />
            </div>
          </div>

          <div className={styles.columnCard} style={{ marginTop: 20 }}>
            <div className={styles.cardHeader}>
              <h3>Faculty Submission Overview</h3>
            </div>
            {Object.keys(facultyStats).length === 0 ? (
              <DeanEmptyState icon={Clipboard} title="No faculty data" description="Faculty submission data will appear once syllabi are created." />
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.plansTable}>
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th style={{ textAlign: 'center' }}>Total</th>
                      <th style={{ textAlign: 'center' }}>Approved</th>
                      <th style={{ textAlign: 'center' }}>Pending</th>
                      <th style={{ textAlign: 'center' }}>Returned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(facultyStats).map(([name, stats]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{stats.total}</td>
                        <td style={{ textAlign: 'center', color: '#27ae60' }}>{stats.approved}</td>
                        <td style={{ textAlign: 'center', color: '#f39c12' }}>{stats.pending}</td>
                        <td style={{ textAlign: 'center', color: '#e74c3c' }}>{stats.returned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'syllabi' && (
        <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '20px 30px 0', gap: 15, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>COURSES</h2>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#374151' }}>Filter by <strong>Status</strong>:</p>
              <select
                value={syllabiStatusFilter}
                onChange={(e) => setSyllabiStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="all">All ({nonDraftSyllabi.length})</option>
                <option value="approved">Approved ({approvedSyllabi.length})</option>
              </select>
            </div>
          </div>
          <div style={{ padding: '0 30px 24px' }}>
            {effectiveSyllabiList.length === 0 ? (
              <DeanEmptyState icon={FileText}
                title="No syllabi found"
                description={syllabiStatusFilter === 'all' ? 'No syllabi in the system yet.' : 'No approved syllabi yet.'}
              />
            ) : (
              <div style={{ width: '100%', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750, fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>CODE</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>COURSE NAME</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>DATE SUBMITTED</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>DATE APPROVED</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>STATUS</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#6b7280', fontSize: 12 }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {effectiveSyllabiList.map((item, i) => {
                      const approvedDate = item.workflow.oicOvpaa?.completedAt || '';
                      return (
                        <tr key={item.code} style={{ borderBottom: i < effectiveSyllabiList.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#3498db', fontFamily: "'Courier New', monospace" }}>{item.code}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13 }}>{item.courseName}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{fmtDate(item.workflow.submittedAt)}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{fmtDate(approvedDate)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <StatusBadge stage={item.workflow.currentStage} />
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                              <ActionButton color="#3498db" onClick={() => navigate(`/role/oic-ovpaa/courses/${encodeURIComponent(item.code)}`)}>View</ActionButton>
                              <ActionButton color="#7c3aed" onClick={() => setVersionHistoryTarget(item.code)}>History</ActionButton>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className={styles.columnCard}>
          <div className={styles.cardHeader}>
            <h3>Syllabi Awaiting Approval</h3>
          </div>
          {pendingApprovals.length === 0 ? (
            <DeanEmptyState icon={Clipboard} title="No pending approvals" description="All submissions have been processed." />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.plansTable}>
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Current Stage</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map(item => (
                    <tr key={item.code}>
                      <td className={styles.code}>{item.code}</td>
                      <td>{item.courseName}</td>
                      <td><StatusBadge stage={item.workflow.currentStage} /></td>
                      <td style={{ fontSize: 12 }}>{fmtDate(item.workflow.submittedAt)}</td>
                      <td className={styles.actions}>
                        <button onClick={() => navigate(`/role/oic-ovpaa/courses/${item.code}`)} className={styles.viewButton}>View</button>
                        {item.workflow.currentStage === 'dean' && (
                          <>
                            <button onClick={() => handleApproveSyllabus(item.code)} className={styles.approveButton}>Approve</button>
                            <button onClick={() => handleReturnSyllabus(item.code)} className={styles.returnButton}>Return</button>
                          </>
                        )}
                        <button onClick={() => setVersionHistoryTarget(item.code)} className={styles.historyButton}>History</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'plans' && (
        <>
          <div className={styles.filterSection}>
            <input type="text" placeholder="Search by course name or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} />
            <select value={semesterFilter} onChange={(e) => setSemesterFilter(e.target.value)} className={styles.filterSelect}>
              <option value="all">All Semesters</option>
              <option value="1st">1st Semester</option>
              <option value="2nd">2nd Semester</option>
              <option value="summer">Summer</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
            </select>
            <button onClick={() => setRefreshKey(k => k + 1)} className={styles.refreshButton}>Refresh</button>
          </div>

          {filteredPlans.length > 0 && (
            <div className={styles.batchControls}>
              <label className={styles.selectAll}>
                <input type="checkbox" checked={selectedPlans.size === filteredPlans.length && filteredPlans.length > 0} onChange={handleSelectAll} />
                Select All ({filteredPlans.length})
              </label>
              <div className={styles.batchActions}>
                <span className={styles.selectedCount}>{selectedPlans.size} selected</span>
                <button onClick={handleBatchExport} disabled={selectedPlans.size === 0 || exporting} className={styles.batchExportButton}>
                  {exporting ? 'Exporting...' : 'Export as ZIP'}
                </button>
              </div>
            </div>
          )}

          <div className={styles.tableWrapper}>
            {filteredPlans.length === 0 ? (
              <DeanEmptyState icon={FileText} title="No approved learning plans" description="No approved learning plans found matching your filters." />
            ) : (
              <table className={styles.plansTable}>
                <thead>
                  <tr>
                    <th className={styles.checkboxCol}><input type="checkbox" checked={selectedPlans.size === filteredPlans.length && filteredPlans.length > 0} onChange={handleSelectAll} /></th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Instructor</th>
                    <th>Academic Year</th>
                    <th>Semester</th>
                    <th>Last Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map(plan => (
                    <tr key={plan.id} className={selectedPlans.has(plan.id) ? styles.selected : ''}>
                      <td className={styles.checkboxCol}><input type="checkbox" checked={selectedPlans.has(plan.id)} onChange={() => handleSelectPlan(plan.id)} /></td>
                      <td className={styles.code}><strong>{plan.course_code || 'N/A'}</strong></td>
                      <td>{plan.course_name}</td>
                      <td>{plan.instructor?.name || 'N/A'}</td>
                      <td>{plan.academic_year}</td>
                      <td>{plan.semester}</td>
                      <td>{plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                      <td className={styles.actions}>
                        <button onClick={() => navigate(`/role/oic_ovpaa/plans/${plan.id}`)} className={styles.viewButton}>View</button>
                        <button onClick={() => handleExportPdf(plan)} className={styles.exportButton} style={{ whiteSpace: 'nowrap' }}>Export PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'faculty' && (
        <div className={styles.columnCard}>
          <div className={styles.cardHeader}>
            <h3>Faculty Submission Overview</h3>
          </div>
          {Object.keys(facultyStats).length === 0 ? (
            <DeanEmptyState icon={Clipboard} title="No faculty data" description="Faculty submission data will appear once syllabi are created." />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.plansTable}>
                <thead>
                  <tr>
                    <th>Faculty Name</th>
                    <th style={{ textAlign: 'center' }}>Total Submissions</th>
                    <th style={{ textAlign: 'center' }}>Approved</th>
                    <th style={{ textAlign: 'center' }}>Pending</th>
                    <th style={{ textAlign: 'center' }}>Returned</th>
                    <th style={{ textAlign: 'center' }}>Approval Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(facultyStats).map(([name, stats]) => {
                    const rate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;
                    return (
                      <tr key={name}>
                        <td style={{ fontWeight: 600 }}>{name}</td>
                        <td style={{ textAlign: 'center' }}>{stats.total}</td>
                        <td style={{ textAlign: 'center', color: '#27ae60' }}>{stats.approved}</td>
                        <td style={{ textAlign: 'center', color: '#f39c12' }}>{stats.pending}</td>
                        <td style={{ textAlign: 'center', color: '#e74c3c' }}>{stats.returned}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <div style={{ width: 60, height: 6, background: '#ecf0f1', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${rate}%`, height: '100%', background: rate >= 70 ? '#27ae60' : rate >= 40 ? '#f39c12' : '#e74c3c', borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{syllabusWorkflows.length}</div>
            <div className={styles.statLabel}>Total Syllabi in System</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{plans.length}</div>
            <div className={styles.statLabel}>Approved Learning Plans</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{selectedPlans.size}</div>
            <div className={styles.statLabel}>Selected for Export</div>
          </div>
        </div>
      )}

      {versionHistoryTarget && (
        <SyllabusVersionHistory
          courseCode={versionHistoryTarget}
          role={role}
          userId={userId}
          onClose={() => setVersionHistoryTarget(null)}
        />
      )}
    </div>
  );
};

export default OICOVPAADashboard;
