import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Download, AlertTriangle, Search, List, Grid } from 'react-feather';
import { fetchCourses } from '../services/api.js';

const OverdueBadge = () => (
    <span
        style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            fontSize: 11,
            fontWeight: 600,
            color: '#DC2626',
            background: '#FEE2E2',
            borderRadius: 4,
            whiteSpace: 'nowrap'
        }}
    >
        <AlertTriangle size={11} color="#DC2626" aria-hidden="true" />
        Overdue
    </span>
);

const ProgramHeadTOSCoursesTable = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Semester', '2nd Semester'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}-{i + 1}</option>);
    }
    
    const location = useLocation();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

        const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        const navUpdate = location.state?.tosStatusUpdate;
        fetchCourses()
            .then(data => {
                let result = data;
                
                if (navUpdate) {
                    result = result.map(c => {
                        if (c.code === navUpdate.courseCode || c.name === navUpdate.courseName) {
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

    const [selectedStatus, setSelectedStatus] = useState(location.state?.initialStatus || 'pending');
    const [examType, setExamType] = useState('Midterm');
    const [schoolYear, setSchoolYear] = useState(String(currentYear));
    const [semester, setSemester] = useState('1st Semester');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('cards');

        const displayedCourses = courses
        .map(row => {
            const tos = examType === 'Midterm' ? row.midtermTos : row.finalsTos;
            const deadline = examType === 'Midterm' ? row.midtermDeadline : row.finalsDeadline;
            const isOverdue = tos ? (tos.status !== 'approved' && deadline && new Date(deadline) < new Date()) : (deadline && new Date(deadline) < new Date());
            const fmt = (ts) => {
                if (!ts) return '';
                const d = new Date(ts);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            };
            return {
                ...row,
                status: tos ? tos.status : 'draft',
                isOverdue,
                dateSubmitted: tos ? fmt(tos.submittedAt) : '',
                dateStatus: tos ? fmt(tos.status === 'approved' ? tos.approvedAt : tos.returnedAt) : ''
            };
        })
        .filter(row => row.status === selectedStatus);

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredCourses = normalizedSearch
        ? displayedCourses.filter(row =>
            (row.code || '').toLowerCase().includes(normalizedSearch) ||
            (row.name || '').toLowerCase().includes(normalizedSearch) ||
            (row.instructor || '').toLowerCase().includes(normalizedSearch)
        )
        : displayedCourses;

    const statusHeader = selectedStatus === 'returned' ? 'DATE RETURNED' : selectedStatus === 'approved' ? 'DATE APPROVED' : 'DATE SUBMITTED';

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
        { value: 'pending', label: 'Pending' },
        { value: 'returned', label: 'Returned' },
        { value: 'approved', label: 'Approved' }
    ];

    const dateLabel = selectedStatus === 'returned'
        ? 'Returned'
        : selectedStatus === 'approved'
        ? 'Approved'
        : 'Submitted';

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
                            onClick={() => setSelectedStatus(tab.value)}
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
                        aria-label="Search course code, name, or instructor"
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
                        const cardDate = selectedStatus === 'pending' ? row.dateSubmitted : row.dateStatus;
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
                                    {row.instructor && (
                                        <p className={styles.ctCardMeta}>{row.instructor}</p>
                                    )}
                                </div>
                                <div className={styles.ctCardFooter}>
                                    <div className={styles.ctCardActions}>
                                        {row.isOverdue && <OverdueBadge />}
                                        {selectedStatus === 'approved' && (
                                            <button type="button" className={`${styles.exportBtn} ${styles.ctExportPill}`} onClick={() => handleExportDemoPdf(row.code, row.name)}>
                                                Export <Download size={16} />
                                            </button>
                                        )}
                                        {row.status === 'pending' ? (
                                            <span className={styles.ctActionPill}>
                                                <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester, role: 'program-head' }}>
                                                    Review
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </span>
                                        ) : (
                                            <span className={styles.ctActionPill}>
                                                <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester, role: 'program-head' }}>
                                                    View
                                                    <ChevronRight size={18} />
                                                </Link>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                ) : (
                <table>
                    <thead>
                    <tr>
                        <th width={200}>{statusHeader}</th>
                        <th width={130}>CODE</th>
                        <th width={300}>COURSE NAME</th>
                        <th width={200}>INSTRUCTOR</th>
                        <th className={styles.fill}></th>
                    </tr>
                    </thead>

                    <tbody>
                    {filteredCourses
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{selectedStatus === 'pending' ? row.dateSubmitted : row.dateStatus}</td>
                                <td width={130}>{row.code}</td>
                                <td width={300}>{row.name}</td>
                                <td width={200}>{row.instructor}</td>
                                <td className={styles.fill} style={{ gap: 20 }}>
                                    {row.isOverdue && <OverdueBadge />}
                                    {selectedStatus === 'approved' && (
                                        <button className={styles.exportBtn} onClick={() => handleExportDemoPdf(row.code, row.name)}>
                                            Export <Download size={16} />
                                        </button>
                                    )}
                                    {row.status === 'pending' ? (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester, role: 'program-head' }}>
                                            Review
                                            <ChevronRight size={18} />
                                        </Link>
                                    ) : (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester, role: 'program-head' }}>
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

export default ProgramHeadTOSCoursesTable;
