import React from "react";
import Skeleton from "../layouts/SkeletonA.jsx";
import Header from "../components/HeaderA.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import TableScrollRegion from '../components/TableScrollRegion.jsx'
import { Search, Clipboard, X } from "react-feather";
import styles from '../styles/CoursesTable.module.sass'
import syllabusStyles from '../styles/SyllabusSections.module.sass'
import pageStyles from '../styles/ProgramHeadWorkspace.module.sass'
import { fetchJson, apiErrorMessage } from '../utils/api.js'
import { computeOverallStatus } from '../utils/assignmentStatus.js'
import { revisionLabel, termLabel } from '../utils/offeringLabels.js'

// The Program Head assigns a course to its lead instructor for a term. If the course already has
// an approved syllabus, the assignment carries it over automatically: the same revision number and
// identical content, shown here as "Carried over (Rev N)". The lead instructor can then start a
// revision from it. Only one working copy exists at a time, and a course gets at most one new
// approved revision per term.
const currentSchoolYear = () => {
    const now = new Date();
    const start = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
    return `${start}-${start + 1}`;
};

const ProgramHeadCourseOfferings = () => {
    const [rows, setRows] = React.useState([]);
    const [options, setOptions] = React.useState({ courses: [], instructors: [], semesters: ['1st', '2nd', 'Summer'] });
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [notice, setNotice] = React.useState('');
    const [searchQuery, setSearchQuery] = React.useState('');
    const [assignOpen, setAssignOpen] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [form, setForm] = React.useState({ pair: '', schoolYear: currentSchoolYear(), semester: '1st', instructorId: '' });

    const load = React.useCallback(async () => {
        setError('');
        try {
            const [assignments, candidates] = await Promise.all([
                fetchJson('/api/assignments?limit=100'),
                fetchJson('/api/offerings/candidates'),
            ]);
            setRows(Array.isArray(assignments?.data) ? assignments.data : []);
            setOptions(prev => ({ ...prev, ...candidates }));
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not load the course offerings.'));
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { load(); }, [load]);

    const instructorName = (row) => options.instructors.find(i => String(i.user_id) === String(row.stakeholder_id))?.name || '—';
    const closeDialog = () => setAssignOpen(false);
    const setField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    const assign = async () => {
        const [courseId, programId] = form.pair.split(':');
        if (!courseId || !form.instructorId) { setError('Choose a course and its lead instructor.'); return; }
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const result = await fetchJson('/api/offerings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: Number(courseId), program_id: Number(programId), instructor_user_id: Number(form.instructorId),
                    school_year: form.schoolYear, semester: form.semester,
                }),
            });
            setNotice(result.carriedOver
                ? `Assigned. The approved syllabus was carried over automatically (Carried over (Rev ${result.revision})).`
                : 'Assigned. This course has no approved syllabus yet, so the instructor starts a new working copy.');
            closeDialog();
            await load();
        } catch (err) {
            setError(apiErrorMessage(err, 'Could not assign the course.'));
        } finally {
            setSaving(false);
        }
    };

    const query = searchQuery.trim().toLowerCase();
    const visible = rows.filter(row => {
        const pco = row.ProgramCourseOffering || {};
        const course = pco.Course || {};
        return !query || String(course.course_no || '').toLowerCase().includes(query) || String(course.course_title || '').toLowerCase().includes(query);
    });

    const pageContent = (
        <div className={pageStyles.managementPage}>
            <div className={pageStyles.pageHeader}>
                <h2>Course Offerings</h2>
                <div className={pageStyles.pageHeaderActions}>
                    <button type="button" className={pageStyles.uploadButton} onClick={() => setAssignOpen(true)}>
                        <Clipboard size={18} color="#FFFFFF" /> Assign course for a term
                    </button>
                </div>
            </div>

            {error && <div role="alert" style={{ margin: '0 0 12px', color: '#b91c1c' }}>{error}</div>}
            {notice && <div role="status" style={{ margin: '0 0 12px', color: '#166534' }}>{notice}</div>}

            <div className={`${syllabusStyles.header} ${pageStyles.dataToolbar}`}>
                <div className={pageStyles.toolbarControls}>
                    <div className={`${syllabusStyles['section-select']} ${pageStyles.searchShell}`}>
                        <Search size={16} style={{ marginRight: 8, color: '#374151' }} />
                        <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search courses" className={pageStyles.searchInput} />
                    </div>
                </div>
            </div>

            {loading ? (
                <p>Loading course offerings…</p>
            ) : visible.length > 0 ? (
                <TableScrollRegion label="Course offerings" minWidth={900} className={styles['table-container']}>
                    <table>
                        <thead style={{ position: 'sticky', top: 0, background: '#FFFFFF', zIndex: 1 }}>
                            <tr>
                                <th width={120}>COURSE</th>
                                <th width={280}>TITLE</th>
                                <th width={170}>TERM</th>
                                <th width={200}>LEAD INSTRUCTOR</th>
                                <th width={150}>STATUS</th>
                                <th className={styles.fill}>REVISION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map(row => {
                                const pco = row.ProgramCourseOffering || {};
                                const course = pco.Course || {};
                                return (
                                    <tr key={row.co_assign_id}>
                                        <td>{course.course_no}</td>
                                        <td>{course.course_title}</td>
                                        <td>{termLabel(pco) || '—'}</td>
                                        <td>{instructorName(row)}</td>
                                        <td>{computeOverallStatus(row)}</td>
                                        <td className={styles.fill}>{revisionLabel(pco)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableScrollRegion>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>No course offerings yet</div>
                    <div style={{ color: '#6B7280', textAlign: 'center', maxWidth: 420 }}>Assign a course to a lead instructor for a term.</div>
                </div>
            )}

            {assignOpen && (
                <div>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }} onClick={closeDialog} />
                    <div role="dialog" aria-modal="true" aria-label="Assign course for a term"
                        className={`${pageStyles.managementDialog} ${pageStyles.dialogNarrow} ${pageStyles.dialogElevated}`}>
                        <div className={pageStyles.dialogHeader}>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>Assign course for a term</h2>
                            <button type="button" className="app-icon-close" aria-label="Close" onClick={closeDialog}><X size={16} /></button>
                        </div>
                        <div className={pageStyles.dialogContent} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <label>Course<br />
                                <select value={form.pair} onChange={(e) => setField('pair', e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Select a course</option>
                                    {options.courses.map(c => (
                                        <option key={`${c.course_id}:${c.program_id}`} value={`${c.course_id}:${c.program_id}`}>
                                            {c.course_no} — {c.course_title} ({c.program_name})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>School year<br />
                                <input value={form.schoolYear} onChange={(e) => setField('schoolYear', e.target.value)} placeholder="2026-2027" style={{ width: '100%' }} />
                            </label>
                            <label>Semester<br />
                                <select value={form.semester} onChange={(e) => setField('semester', e.target.value)} style={{ width: '100%' }}>
                                    {options.semesters.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                            <label>Lead instructor<br />
                                <select value={form.instructorId} onChange={(e) => setField('instructorId', e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Select the lead instructor</option>
                                    {options.instructors.map(i => <option key={i.user_id} value={i.user_id}>{i.name}</option>)}
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

export default ProgramHeadCourseOfferings;
