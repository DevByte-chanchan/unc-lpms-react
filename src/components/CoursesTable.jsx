import {useState, useMemo} from 'react';
import React from 'react';
import {Link, useSearchParams} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Download, HelpCircle } from 'react-feather';
import { syllabiData } from '../data/syllabiData';
import { exportSyllabusToPDF } from '../utils/pdfExport';
import { getWorkflow } from '../utils/workflowHelpers';

const getProgram = (code) => {
  if (code && code.startsWith('IT ')) return 'Information Technology';
  return 'Computer Science';
};

const CoursesTable = ({}) => {

    const [searchParams, setSearchParams] = useSearchParams();
    const initialStatus = searchParams.get('status') || 'DRAFT';

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];

    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const fmt = (iso) => {
        if (!iso) return ''
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }

    const baseCourses = syllabiData.map(s => ({
        code: s.code,
        name: s.name,
        lastUpdated: s.update || 'TBA',
        program: getProgram(s.code),
        docsUploaded: 3,
        docsTotal: 3,
    }));

    const getDerivedStatus = (code) => {
        const wf = getWorkflow(code)
        const stage = wf.currentStage || 'submitted'
        if (stage === 'approved') return 'APPROVED'
        if (stage === 'returned') return 'RETURNED'
        if (stage === 'submitted') return 'DRAFT'
        return 'PENDING'
    }

    const getSubmittedDate = (code) => {
        const wf = getWorkflow(code)
        return fmt(wf.submittedAt)
    }

    const getApprovedDate = (code) => {
        const wf = getWorkflow(code)
        return fmt(wf.dean?.completedAt)
    }

    const getReviewerStatuses = (code) => {
        const wf = getWorkflow(code)
        const stage = wf.currentStage || 'submitted'
        const stageOrder = ['submitted', 'parallel_review', 'program_head', 'dean', 'approved']
        const stageIndex = stageOrder.indexOf(stage)
        const effectiveIndex = stageIndex

        const reviewerStageMap = {
            industry_consultant: 'parallel_review',
            library_director: 'parallel_review',
            programHead: 'parallel_review',
            dean: 'dean',
        }

        const isReviewerReached = (reviewerKey) => {
            const revStageIndex = stageOrder.indexOf(reviewerStageMap[reviewerKey])
            return effectiveIndex >= revStageIndex
        }

        const checkStatus = (revStatus, reviewerKey) => {
            if (revStatus === 'done') return 'A'
            if (revStatus === 'returned') return 'R'
            if (revStatus === 'pending' && isReviewerReached(reviewerKey)) return 'P'
            return ''
        }

        const ic = checkStatus(wf.parallelReview?.industry_consultant?.status, 'industry_consultant')
        const lib = checkStatus(wf.parallelReview?.library_director?.status, 'library_director')
        const ph = checkStatus(wf.programHead?.status, 'programHead')
        const dean = checkStatus(wf.dean?.status, 'dean')

        return [
            { role: 'Industry Consultant',    name: 'Roberto Cruz',   status: ic },
            { role: 'Director of Libraries',  name: 'Maria Santos',   status: lib },
            { role: 'Program Head',           name: 'Junar Danila',   status: ph },
            { role: 'Dean',                   name: 'Agnes Reyes',    status: dean },
        ]
    }

    const [tick, setTick] = useState(0)
    React.useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 2000)
        return () => clearInterval(interval)
    }, [])

    const Courses = useMemo(() => baseCourses.map(c => ({
        ...c,
        status: getDerivedStatus(c.code),
        submittedDate: getSubmittedDate(c.code),
        approved: getApprovedDate(c.code),
        reviewerStatuses: getReviewerStatuses(c.code),
    })), [tick])

    const [selectedStatus, setSelectedStatus] = useState(initialStatus);
    const handleStatusChange = (e) => {
        const val = e.target.value;
        setSelectedStatus(val);
        setSearchParams({ status: val });
    }

    const getStatusBadge = (text, type) => {
        const styles_map = {
            approved: { color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
            pending: { color: '#b45309', background: '#fffbeb', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
            draft: { color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
            returned: { color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
        }
        return <span style={styles_map[type] || styles_map.draft}>{text}</span>
    }

    const getStatusForCourse = (statusKey) => {
        switch (statusKey) {
            case 'APPROVED': return getStatusBadge('Approved', 'approved')
            case 'PENDING': return getStatusBadge('Pending', 'pending')
            case 'DRAFT': return getStatusBadge('Draft', 'draft')
            case 'RETURNED': return getStatusBadge('Returned', 'returned')
            default: return getStatusBadge('Draft', 'draft')
        }
    }

    const getStatusLabel = (char) => {
        if (char === 'A') return 'Approved'
        if (char === 'P') return 'Pending'
        if (char === 'R') return 'Returned'
        return '\u2014'
    }

    const generatePDF = (course) => {
        const syllabus = syllabiData.find(s => s.code === course.code)
        if (syllabus) {
            exportSyllabusToPDF(syllabus, course.code)
        }
    }

    const [statusPopup, setStatusPopup] = useState(null);
    const [popupPos, setPopupPos] = useState(null);

    const filteredCourses = useMemo(() => {
        if (selectedStatus === 'PENDING') return Courses.filter(r => r.status === 'PENDING' || r.status === 'RETURNED')
        return Courses.filter(r => r.status === selectedStatus)
    }, [Courses, selectedStatus])

    return (
        <div className={styles['courses-table']}>
            <div className={styles.header}>
                <h2>ASSIGNED COURSES</h2>
                <div className={styles.filterA}>
                    <select className={styles['header-select']}>
                        {yearOptions}
                    </select>
                    <select className={styles['header-select']}>
                        {semOptions.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.fill}></div>
                <div className={'filter-container'}>
                    <p>Filter by <strong>Status</strong>:</p>
                    <select onChange={handleStatusChange} value={selectedStatus}>
                        <option value="DRAFT">Draft ({Courses.filter(r => r.status === 'DRAFT').length})</option>
                        <option value="PENDING">Pending ({Courses.filter(r => r.status === 'PENDING' || r.status === 'RETURNED').length})</option>
                        <option value="APPROVED">Approved ({Courses.filter(r => r.status === 'APPROVED').length})</option>
                    </select>
                </div>
            </div>

            <div className={styles['table-container']}>
                <table>
                    <thead>
                        <tr>
                            <th width={150}>CODE</th>
                            <th width={250}>COURSE NAME</th>
                            <th width={130}>PROGRAM</th>
                            <th width={140}>LAST UPDATED</th>
                            <th width={110}>STATUS</th>
                            <th className={styles.fill}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCourses.map((row, index) => (
                            <tr key={index}>
                                <td width={150}>{row.code}</td>
                                <td width={250}>{row.name}</td>
                                <td width={130}>{row.program}</td>
                                <td width={140}>{row.lastUpdated}</td>
                                <td width={110}>{getStatusForCourse(row.status)}</td>
                                <td className={styles.fill}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                        {row.status === 'APPROVED' && (
                                            <button
                                                onClick={() => generatePDF(row)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: '#111827' }}
                                            >
                                                Export
                                            </button>
                                        )}
                                        {(row.status === 'DRAFT' || row.status === 'PENDING' || row.status === 'RETURNED') && (
                                            <Link className={'actionLink'} to={row.status === 'RETURNED' ? `/revisions/${encodeURIComponent(row.code)}` : `/courses/${encodeURIComponent(row.code)}`}
                                                state={{ from: '/', fromStatus: selectedStatus }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#111827' }}
                                            >
                                                {row.status === 'DRAFT' ? 'Compose' : row.status === 'RETURNED' ? 'Update' : 'View'} <ChevronRight size={16} />
                                            </Link>
                                        )}
                                        {row.status === 'APPROVED' && (
                                            <Link className={'actionLink'} to={`/role/instructor/courses/${encodeURIComponent(row.code)}?status=approved`}
                                                state={{ from: '/', fromStatus: selectedStatus }}
                                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, textDecoration: 'none', color: '#111827' }}
                                            >
                                                View <ChevronRight size={16} />
                                            </Link>
                                        )}
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); setPopupPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right }); setStatusPopup(statusPopup === row.code ? null : row.code); }}
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
                                            {statusPopup === row.code && popupPos && (
                                                <>
                                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => { setStatusPopup(null); setPopupPos(null); }} />
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
                                                    {row.reviewerStatuses.map((r, i) => (
                                                        <div key={i} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
                                                                <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>{r.role}</div>
                                                            </div>
                                                            <div style={{
                                                                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap',
                                                                color: r.status === 'A' ? '#047857' : r.status === 'P' ? '#b45309' : r.status === 'R' ? '#dc2626' : '#94a3b8',
                                                                background: r.status === 'A' ? '#ecfdf5' : r.status === 'P' ? '#fffbeb' : r.status === 'R' ? '#fef2f2' : '#f1f5f9',
                                                            }}>
                                                                {getStatusLabel(r.status)}
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
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredCourses.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No courses found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CoursesTable;
