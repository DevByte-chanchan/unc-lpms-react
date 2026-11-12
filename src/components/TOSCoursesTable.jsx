import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Download, AlertTriangle, Lock, Search, List, Grid } from 'react-feather';
import { fetchCourses } from '../services/api.js';
import { PROGRAM_HEAD } from '../constants/users.js';
const OverdueBadge = () => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: '#DC2626',
            background: 'transparent',
            border: '1px solid #DC2626',
            borderRadius: 9999,
            whiteSpace: 'nowrap'
        }}
    >
        <AlertTriangle size={11} color="#DC2626" aria-hidden="true" />
        Overdue
    </span>
);

const TOSCoursesTable = () => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Semester', '2nd Semester'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}-{i + 1}</option>);
    }
    const nortonCourses = new Set(['BSCS111L','BSCS212L','BSCS313L','BSCS321L','BSCS221L','BSCS341L','BSCS342L','BSCS214L','BSCS222L','BSCS223L','BSCS314L','BSCS323L']);

    
    
    
    
    
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
        const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        const navUpdate = location.state?.tosStatusUpdate;
        fetchCourses()
            .then(data => {
                let result = data;
                if (nortonCourses.size > 0) {
                    result = data.filter(c => nortonCourses.has(c.code));
                }
                
                if (navUpdate) {
                    result = result.map(c => {
                        if (c.name === navUpdate.courseName) {
                            const newTos = { ...c.midtermTos, status: navUpdate.newStatus };
                            return { ...c, midtermTos: newTos };
                        }
                        return c;
                    });
                }
                setCourses(result);
                setErrorMsg(null);
            })
            .catch((err) => {
                console.error(err);
                setErrorMsg('Failed to load courses. Please try again later.');
            })
            .finally(() => setLoading(false));
    }, []);

    const queryStatus = new URLSearchParams(location.search).get('status');
    const [selectedStatus, setSelectedStatus] = useState(location.state?.initialStatus || queryStatus || 'draft');

    useEffect(() => {
        const nextStatus = location.state?.initialStatus || new URLSearchParams(location.search).get('status');
        if (nextStatus) {
            setSelectedStatus(nextStatus);
        }
    }, [location.state, location.search]);
    const [examType, setExamType] = useState('Midterm');
    const [schoolYear, setSchoolYear] = useState(String(currentYear));
    const [semester, setSemester] = useState('1st Semester');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('cards');
    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value)
    }

        const displayedCourses = courses.map(c => {
        const tos = examType === 'Midterm' ? c.midtermTos : c.finalsTos;
        const deadline = examType === 'Midterm' ? c.midtermDeadline : c.finalsDeadline;
        const isOverdue = tos ? (tos.status !== 'approved' && deadline && new Date(deadline) < new Date()) : (deadline && new Date(deadline) < new Date());
        const fmt = (ts) => {
            if (!ts) return '';
            const d = new Date(ts);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        return {
            ...c,
            status: tos ? tos.status : 'draft',
            isOverdue,
            dateAssigned: fmt(c.created_at) || '',
            update: fmt(c.updated_at) || '',
            dateSubmitted: tos ? fmt(tos.submittedAt) : '',
            dateStatus: tos ? fmt(tos.status === 'approved' ? tos.approvedAt : tos.returnedAt) : ''
        };
    }).filter(c => {
        if (selectedStatus === 'draft' && c.status !== 'draft') return false;
        if (selectedStatus === 'pending' && c.status !== 'pending') return false;
        if (selectedStatus === 'returned' && c.status !== 'returned') return false;
        if (selectedStatus === 'approved' && c.status !== 'approved') return false;
        return true;
    });

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredCourses = normalizedSearch
        ? displayedCourses.filter(c =>
            (c.code || '').toLowerCase().includes(normalizedSearch) ||
            (c.name || '').toLowerCase().includes(normalizedSearch)
        )
        : displayedCourses;

    const nonDraft = selectedStatus === 'pending' || selectedStatus === 'approved' || selectedStatus === 'returned';
    const statusHeader = selectedStatus === 'returned' ? 'DATE RETURNED' : selectedStatus === 'approved' ? 'DATE APPROVED' : '';
    const reviewerHeader = selectedStatus === 'returned' ? 'RETURNED BY' : selectedStatus === 'approved' ? 'APPROVED BY' : '';

    // Demo-only: approved-course Export buttons download a placeholder PDF (no server call)
    // Same logic as handleExportDemoPdf in TosSections.jsx
    const handleExportDemoPdf = (courseCode, courseName) => {
        try {
            const safeName = String(courseCode || courseName || 'TOS').replace(/[\\/:*?"<>|]/g, '').trim() || 'TOS';
            const link = document.createElement('a');
            link.href = '/tos-sample.pdf';
            link.download = `TOS - ${safeName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // demo placeholder download: nothing to recover
        }
    };

    const statusTabs = [
        { value: 'draft', label: 'Draft' },
        { value: 'pending', label: 'Pending' },
        { value: 'returned', label: 'Returned' },
        { value: 'approved', label: 'Approved' }
    ];

    const dateLabel = selectedStatus === 'returned'
        ? 'Returned'
        : selectedStatus === 'approved'
        ? 'Approved'
        : selectedStatus === 'pending'
        ? 'Submitted'
        : 'Assigned';

    return (
        <div className={styles['courses-table']}>

            <div className={`${styles.header} ${styles.ctToolbar}`}>
                <div className={styles.ctToolbarLeft}>
                    <h2 className={styles.ctTitle}>ASSIGNED TABLE OF SPECIFICATIONS</h2>
                    <div className={`${styles.filterA} ${styles.ctSelectorsPill}`}>
                        <select className={styles['header-select']} value={schoolYear} onChange={e => setSchoolYear(e.target.value)}>
                            {yearOptions}
                        </select>
                        <select className={styles['header-select']} value={semester} onChange={e => setSemester(e.target.value)}>
                            {semOptions.map(sem => (
                                <option key={sem} value={sem}>{sem}</option>
                            ))}
                        </select>
                        <select className={styles['header-select']} value={examType} onChange={e => setExamType(e.target.value)}>
                            <option key="Midterm" value="Midterm">Midterm</option>
                            <option key="Finals" value="Finals" disabled title="Not available yet">Finals</option>
                        </select>
                    </div>
                </div>

                <div className={styles.ctStatusTabs} role="tablist" aria-label="Filter by status">
                    {statusTabs.map(tab => (
                        <button
                            key={tab.value}
                            type="button"
                            role="tab"
                            aria-selected={selectedStatus === tab.value}
                            className={`${styles.ctStatusTab} ${selectedStatus === tab.value ? styles.ctStatusTabActive : ''}`}
                            onClick={() => handleStatusChange({ target: { value: tab.value } })}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.ctControlsRow}>
                <div className={styles.ctSearchBox}>
                    <Search size={16} className={styles.ctSearchIcon} aria-hidden="true" />
                    <input
                        type="text"
                        className={styles.ctSearchInput}
                        placeholder="Search course code or name..."
                        aria-label="Search course code or name"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className={styles.ctViewToggle} role="group" aria-label="View mode">
                    <button
                        type="button"
                        className={`${styles.ctViewBtn} ${viewMode === 'list' ? styles.ctViewBtnActive : ''}`}
                        aria-label="List view"
                        aria-pressed={viewMode === 'list'}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={16} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={`${styles.ctViewBtn} ${viewMode === 'cards' ? styles.ctViewBtnActive : ''}`}
                        aria-label="Card view"
                        aria-pressed={viewMode === 'cards'}
                        onClick={() => setViewMode('cards')}
                    >
                        <Grid size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

                        <div className={styles['table-container']}>
                {loading ? (
                    <div className={styles.loadingCell}>Loading courses...</div>
                ) : errorMsg ? (
                    <div className={styles.loadingCell} style={{color: 'red'}}>{errorMsg}</div>
                ) : displayedCourses.length === 0 ? (
                    <div className={styles.loadingCell} style={{color: '#6B7280'}}>No courses in this status.</div>
                ) : filteredCourses.length === 0 ? (
                    <div className={styles.loadingCell} style={{color: '#6B7280'}}>No courses found</div>
                ) : viewMode === 'cards' ? (
                <div className={styles.ctCardGrid}>
                    {filteredCourses.map((row, index) => {
                        const cardDate = !nonDraft
                            ? row.dateAssigned
                            : selectedStatus === 'pending'
                            ? row.dateSubmitted
                            : (row.dateStatus || row.dateSubmitted);
                        return (
                            <div key={index} className={styles.ctCard}>
                                <div className={styles.ctCardHeader}>
                                    <span className={styles.ctCodePill}>{row.code}</span>
                                    <span className={styles.ctCardDate} title={`${dateLabel}: ${cardDate}`}>
                                        <span className={styles.ctCardDateLabel}>{dateLabel}:</span>
                                        {cardDate}
                                    </span>
                                </div>
                                <div className={styles.ctCardBody}>
                                    <h3 className={styles.ctCardTitle} title={row.name}>{row.name}</h3>
                                    {(selectedStatus === 'returned' || selectedStatus === 'approved') && (
                                        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                                            {selectedStatus === 'returned' ? `Returned by ${PROGRAM_HEAD.display}` : `Approved by ${PROGRAM_HEAD.display}`}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.ctCardFooter}>
                                    <div className={styles.ctCardActions}>
                                        {selectedStatus === 'approved' && (
                                            <button type="button" className={`${styles.exportBtn} ${styles.ctExportPill}`} onClick={() => handleExportDemoPdf(row.code, row.name)}>
                                                Export <Download size={16} />
                                            </button>
                                        )}
                                        {row.status === 'draft' ? (
                                            (examType === 'Midterm' ? row.midtermLock?.locked : row.finalsLock?.locked) ? (
                                                <div
                                                    className={styles.ctLockPill}
                                                    title={examType === 'Midterm' ? row.midtermLock?.reason : row.finalsLock?.reason}
                                                >
                                                    <Lock size={13} aria-hidden="true" />
                                                    <span>{((examType === 'Midterm' ? row.midtermLock?.reason : row.finalsLock?.reason) || '').replace(/^Locked:\s*/i, '')}</span>
                                                </div>
                                            ) : (
                                                <span className={styles.ctActionPill}>
                                                    <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                                        Compose
                                                        <ChevronRight size={18} />
                                                    </Link>
                                                </span>
                                            )
                                        ) : row.status === 'returned' ? (
                                            <span className={styles.ctActionPill}>
                                                <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                                    Revise
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </span>
                                        ) : (
                                            <span className={styles.ctActionPill}>
                                                <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                                    View
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </span>
                                        )}
                                    </div>
                                    {row.isOverdue && <OverdueBadge />}
                                </div>
                            </div>
                        );
                    })}
                </div>
                ) : (
                <table>
                    <thead>
                    <tr>
                        <th width={200}>{nonDraft ? 'DATE SUBMITTED' : 'DATE ASSIGNED'}</th>
                        <th width={130}>CODE</th>
                        <th width={320}>COURSE NAME</th>
                        {nonDraft && selectedStatus !== 'pending' && <th width={200}>{statusHeader}</th>}
                        {nonDraft && selectedStatus !== 'pending' && <th width={180} style={{ whiteSpace: 'nowrap' }}>{reviewerHeader}</th>}
                        {!nonDraft && <th width={200}>LAST UPDATED</th>}
                        <th className={styles.fill}></th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredCourses
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{nonDraft ? row.dateSubmitted : row.dateAssigned}</td>
                                <td width={130}>{row.code}</td>
                                <td width={320}>{row.name}</td>
                                {nonDraft && selectedStatus !== 'pending' && (
                                    <td width={200}>{row.dateStatus || row.dateSubmitted}</td>
                                )}
                                {nonDraft && selectedStatus !== 'pending' && (
                                    <td width={180} style={{ whiteSpace: 'nowrap' }}>
                                        {PROGRAM_HEAD.display}
                                    </td>
                                )}
                                {!nonDraft && <td width={200}>{row.update}</td>}
                                <td className={styles.fill} style={{ gap: 20 }}>
                                    {row.isOverdue && <OverdueBadge />}
                                    {selectedStatus === 'approved' && (
                                        <button className={styles.exportBtn} onClick={() => handleExportDemoPdf(row.code, row.name)}>
                                            Export <Download size={16} />
                                        </button>
                                    )}
                                    {row.status === 'draft' ? (
                                        (examType === 'Midterm' ? row.midtermLock?.locked : row.finalsLock?.locked) ? (
                                            <div
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', cursor: 'not-allowed' }}
                                                title={examType === 'Midterm' ? row.midtermLock?.reason : row.finalsLock?.reason}
                                            >
                                                <Lock size={13} aria-hidden="true" />
                                                <span>{((examType === 'Midterm' ? row.midtermLock?.reason : row.finalsLock?.reason) || '').replace(/^Locked:\s*/i, '')}</span>
                                            </div>
                                        ) : (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                            Compose
                                            <ChevronRight size={18} />
                                        </Link>
                                        )
                                    ) : row.status === 'returned' ? (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                            Revise
                                            <ChevronRight size={18} />
                                        </Link>
                                    ) : (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                            View
                                            <ChevronRight size={18} />
                                        </Link>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>
        </div>
    );
};

export default TOSCoursesTable;
