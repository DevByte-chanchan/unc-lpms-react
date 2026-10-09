import React from "react";
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import { Search, Clipboard, X } from "react-feather";
import ConsultantsTable from '../components/ConsultantsTable.jsx'
import syllabusStyles from '../styles/SyllabusSections.module.sass'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'

// The Program Head assigns an industry consultant to a course. A consultant reads only the courses
// they are actively assigned to and may comment; their comments are documentation and never block
// the approval chain. Assignments are deactivated, never deleted.
const ProgramHeadIndustryConsultant = () => {
    const [assignments, setAssignments] = React.useState([]);
    const [candidates, setCandidates] = React.useState({ courses: [], consultants: [] });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [assignOpen, setAssignOpen] = React.useState(false);
    const [courseId, setCourseId] = React.useState('');
    const [consultantId, setConsultantId] = React.useState('');
    const [busyId, setBusyId] = React.useState(null);
    const [saving, setSaving] = React.useState(false);

    const load = React.useCallback(async () => {
        setError('');
        try {
            const [rows, options] = await Promise.all([
                fetchJson('/api/course-consultants'),
                fetchJson('/api/course-consultants/candidates'),
            ]);
            setAssignments(Array.isArray(rows) ? rows : []);
            setCandidates({ courses: options.courses || [], consultants: options.consultants || [] });
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load the consultant assignments.'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const closeDialog = () => { setAssignOpen(false); setCourseId(''); setConsultantId(''); };

    const assign = async () => {
        if (!courseId || !consultantId) { setError('Choose a course and a consultant.'); return; }
        setSaving(true);
        setError('');
        try {
            await fetchJson('/api/course-consultants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: Number(courseId), consultant_user_id: Number(consultantId) }),
            });
            closeDialog();
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not assign the consultant.'));
        } finally {
            setSaving(false);
        }
    };

    const deactivate = async (row) => {
        setBusyId(row.course_consultant_id);
        setError('');
        try {
            await fetchJson(`/api/course-consultants/${row.course_consultant_id}/deactivate`, { method: 'PUT' });
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not deactivate the assignment.'));
        } finally {
            setBusyId(null);
        }
    };

    // Re-assigning a deactivated consultant reactivates the same record.
    const reactivate = async (row) => {
        setBusyId(row.course_consultant_id);
        setError('');
        try {
            await fetchJson('/api/course-consultants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: row.course_id, consultant_user_id: row.consultant_user_id }),
            });
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not reactivate the assignment.'));
        } finally {
            setBusyId(null);
        }
    };

    const query = searchQuery.trim().toLowerCase();
    const visible = assignments.filter(row => !query
        || String(row.consultant_name || '').toLowerCase().includes(query)
        || String(row.course_no || '').toLowerCase().includes(query)
        || String(row.course_title || '').toLowerCase().includes(query));

    const pageContent = (
        <div className={pageStyles.managementPage}>
            <div className={pageStyles.pageHeader}>
                <h2>Industry Consultant</h2>
                <div className={pageStyles.pageHeaderActions}>
                    <button type="button" className={pageStyles.uploadButton} onClick={() => setAssignOpen(true)}>
                        <Clipboard size={18} color="#FFFFFF" /> Assign consultant
                    </button>
                </div>
            </div>

            {error && <div role="alert" style={{ margin: '0 0 12px', color: '#b91c1c' }}>{error}</div>}

            <div className={`${syllabusStyles.header} ${pageStyles.dataToolbar}`}>
                <div className={pageStyles.toolbarControls}>
                    <div className={`${syllabusStyles['section-select']} ${pageStyles.searchShell}`}>
                        <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search consultants" className={pageStyles.searchInput} />
                    </div>
                </div>
            </div>

            {loading ? (
                <p>Loading assignments…</p>
            ) : visible.length > 0 ? (
                <ConsultantsTable assignments={visible} onDeactivate={deactivate} onReactivate={reactivate} busyId={busyId} />
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No consultant assignments yet</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>
                        Assign an industry consultant to a course. They can read that course and comment; their comments are kept as documentation.
                    </div>
                </div>
            )}

            {assignOpen && (
                <div>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={closeDialog} />
                    <div role="dialog" aria-modal="true" aria-label="Assign consultant"
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}>
                        <div className={pageStyles.dialogHeader}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Assign consultant</h2>
                            <button type="button" className="app-icon-close" aria-label="Close" onClick={closeDialog}><X size={16} /></button>
                        </div>
                        <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label>Course<br />
                                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Select a course</option>
                                    {candidates.courses.map(c => <option key={c.course_id} value={c.course_id}>{c.course_no} — {c.course_title}</option>)}
                                </select>
                            </label>
                            <label>Industry consultant<br />
                                <select value={consultantId} onChange={(e) => setConsultantId(e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Select a consultant</option>
                                    {candidates.consultants.map(c => <option key={c.user_id} value={c.user_id}>{c.name}</option>)}
                                </select>
                            </label>
                        </div>
                        <div className={pageStyles.managementDialogActions}>
                            <button type="button" onClick={closeDialog}
                                style={{ flex: 1, height: 40, background: '#FFFFFF', border: '1px solid #111827', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={assign} disabled={saving}
                                style={{ flex: 1, height: 40, background: '#2C3744', color: '#FFFFFF', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                                {saving ? 'Assigning…' : 'Assign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <Skeleton
            header={<Header role="Program Head" />}
            nav={<SideNavigation mode="program-head" />}
            content={pageContent}
        />
    );
}

export default ProgramHeadIndustryConsultant;
