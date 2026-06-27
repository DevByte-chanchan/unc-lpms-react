import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../../../styles/VPAADashboard.module.scss';
import * as service from '../../../services/learningPlanService';
import * as syllabusService from '../../../services/syllabusService';
import { getSyllabi } from '../../../utils/dataStore';
import { exportSyllabusToPDF } from '../../../utils/pdfExport';
import { FileText, Clipboard } from 'react-feather';
import {
  StatusBadge, DeanEmptyState, ActionButton, fmtDate
} from './dashboardHelpers';

const VPAADashboard = () => {
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

  const userId = parseInt(localStorage.getItem('userId') || '40');
  const role = 'vpaa';

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
      console.warn('Failed to load syllabus approvals', err.message);
    }
  };

  const syllabi = useMemo(() => {
    const all = getSyllabi() || [];
    return all.map(s => ({
      ...s,
      courseName: s.course_name || s.name || s.courseName || s.title || '',
      code: s.code || s.course_code || ''
    }));
  }, []);

  const effectiveSyllabi = useMemo(() => {
    const filterVal = syllabiStatusFilter;
    if (filterVal === 'all' || filterVal === 'approved') return syllabi;
    return syllabi.filter(s => ((s.status || '').toUpperCase()) === filterVal.toUpperCase());
  }, [syllabi, syllabiStatusFilter]);

  const pendingApprovals = useMemo(() => {
    return syllabi.filter(s => {
      const stage = s.currentStage || s.workflow?.currentStage || '';
      return stage !== 'approved';
    });
  }, [syllabi]);

  const filteredSyllabi = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return effectiveSyllabi;
    return effectiveSyllabi.filter(s =>
      (s.code || '').toLowerCase().includes(term) ||
      (s.courseName || '').toLowerCase().includes(term)
    );
  }, [effectiveSyllabi, searchTerm]);

  const approvedLPCount = plans.filter(p => p.status === 'approved').length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPlans(new Set(plans.map(p => p.id)));
    } else {
      setSelectedPlans(new Set());
    }
  };

  const handleSelectPlan = (id) => {
    const next = new Set(selectedPlans);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlans(next);
  };

  const handleBatchExport = async () => {
    if (selectedPlans.size === 0) {
      showToast('Please select at least one learning plan', 'warning');
      return;
    }
    try {
      setExporting(true);
      await service.exportBatchPDF(role, userId, { plan_ids: Array.from(selectedPlans) });
      showToast(`Exported ${selectedPlans.size} learning plan/s successfully!`);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to export PDFs', 'warning');
    } finally {
      setExporting(false);
    }
  };

  const handleApproveSyllabus = async (code) => {
    try {
      await syllabusService.approveSyllabus(role, userId, code);
      showToast(`Syllabus ${code} approved successfully!`);
      setRefreshKey(k => k + 1);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve syllabus', 'warning');
    }
  };

  const handleReturnSyllabus = async (code) => {
    const comments = window.prompt('Enter reason for returning:');
    if (!comments) return;
    try {
      await syllabusService.returnSyllabus(role, userId, code, { comments });
      showToast(`Syllabus ${code} returned for revision.`);
      setRefreshKey(k => k + 1);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to return syllabus', 'warning');
    }
  };

  const handleExportSyllabusPDF = async (item) => {
    try {
      const workflow = item.workflow || {};
      const approval = syllabusApprovals.find(a => a.course_code === item.code);
      const syllabus = {
        ...item,
        instructor: item.instructor || approval?.instructor_name || '—',
        department: item.department || 'SCIS',
        courseName: item.courseName,
        semester: item.sem || item.semester || '—',
        courseOutcomes: item.courseOutcomes || [],
        description: item.description || '',
      };
      exportSyllabusToPDF(syllabus, item.code, workflow);
      showToast('PDF exported successfully!');
    } catch (e) {
      showToast(e.message || 'Failed to export PDF', 'warning');
    }
  };

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${styles[toast.type]}`}>
          {toast.msg}
        </div>
      )}

      <div className={styles.header}>
        <h1>VPAA Dashboard</h1>
        <p className={styles.subtitle}>Oversight and approval management for syllabi and learning plans</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'syllabi' ? styles.active : ''}`} onClick={() => setActiveTab('syllabi')}>
          <FileText size={16} /> Syllabi
        </button>
        <button className={`${styles.tab} ${activeTab === 'pending' ? styles.active : ''}`} onClick={() => setActiveTab('pending')}>
          Pending Approvals
        </button>
        <button className={`${styles.tab} ${activeTab === 'plans' ? styles.active : ''}`} onClick={() => setActiveTab('plans')}>
          Approved Learning Plans
        </button>
      </div>

      {activeTab === 'syllabi' && (
        <div className={styles.columnCard}>
          <div className={styles.cardHeader}>
            <h3>All Syllabi</h3>
            <div className={styles.filterSection}>
              <select value={syllabiStatusFilter} onChange={(e) => setSyllabiStatusFilter(e.target.value)} className={styles.filterSelect}>
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="draft">Draft</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>
          {filteredSyllabi.length === 0 ? (
            <DeanEmptyState icon={FileText} title="No syllabi found" description="Syllabi will appear here once created." />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.plansTable}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Name</th>
                    <th>Submitted</th>
                    <th>Approved</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSyllabi.map((item, i) => {
                    const workflow = item.workflow || {};
                    const submittedAt = workflow.submittedAt || workflow.submitted_at || '';
                    const approvedDate = workflow.vpaa?.completedAt || '';
                    return (
                      <tr key={item.code} style={{ borderBottom: i < filteredSyllabi.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#3498db', fontFamily: "'Courier New', monospace" }}>{item.code}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13 }}>{item.courseName}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{fmtDate(submittedAt)}</td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{fmtDate(approvedDate)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge stage={workflow.currentStage} />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <ActionButton color="#3498db" onClick={() => navigate(`/role/vpaa/courses/${encodeURIComponent(item.code)}`)}>View</ActionButton>
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
                        <button onClick={() => navigate(`/role/vpaa/courses/${item.code}`)} className={styles.viewButton}>View</button>
                        {item.workflow.currentStage === 'dean' && (
                          <>
                            <button onClick={() => handleApproveSyllabus(item.code)} className={styles.approveButton}>Approve</button>
                            <button onClick={() => handleReturnSyllabus(item.code)} className={styles.returnButton}>Return</button>
                          </>
                        )}
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
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="returned">Returned</option>
            </select>
            <button onClick={handleBatchExport} className={styles.exportButton} disabled={exporting || selectedPlans.size === 0}>
              {exporting ? 'Exporting...' : `Export PDFs (${selectedPlans.size})`}
            </button>
          </div>

          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : plans.length === 0 ? (
            <DeanEmptyState />
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.plansTable}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input type="checkbox" onChange={handleSelectAll} checked={selectedPlans.size === plans.length && plans.length > 0} />
                    </th>
                    <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Instructor</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans
                    .filter(p => semesterFilter === 'all' || (p.semester || '').includes(semesterFilter))
                    .filter(p => statusFilter === 'all' || p.status === statusFilter)
                    .map((plan, i) => (
                      <tr key={plan.id}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedPlans.has(plan.id)} onChange={() => handleSelectPlan(plan.id)} />
                        </td>
                        <td className={styles.code}>{plan.course_code}</td>
                        <td>{plan.course_name}</td>
                        <td>{plan.instructor?.name || 'N/A'}</td>
                        <td><StatusBadge stage={plan.status} /></td>
                        <td style={{ fontSize: 12, color: '#6b7280' }}>{plan.createdAt ? new Date(plan.createdAt).toLocaleDateString() : '-'}</td>
                        <td className={styles.actions}>
                          <button onClick={() => navigate(`/role/vpaa/plans/${plan.id}`)} className={styles.viewButton}>View</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{syllabi.length}</div>
            <div className={styles.statLabel}>Total Syllabi</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{approvedLPCount}</div>
            <div className={styles.statLabel}>Approved Learning Plans</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statNumber}>{selectedPlans.size}</div>
            <div className={styles.statLabel}>Selected for Export</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPAADashboard;
