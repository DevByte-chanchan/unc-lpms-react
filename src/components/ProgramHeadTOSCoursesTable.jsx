import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Download } from 'react-feather';
import { fetchCourses } from '../services/api.js';

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

        const displayedCourses = courses
        .map(row => {
            const tos = examType === 'Midterm' ? row.midtermTos : row.finalsTos;
            const deadline = examType === 'Midterm' ? row.midtermDeadline : row.finalsDeadline;
            const isOverdue = tos ? (tos.status !== 'approved' && deadline && new Date(deadline) < new Date()) : (deadline && new Date(deadline) < new Date());
            const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';
            return {
                ...row,
                status: tos ? tos.status : 'draft',
                isOverdue,
                dateSubmitted: tos ? fmt(tos.submittedAt) : '',
                dateStatus: tos ? fmt(tos.status === 'approved' ? tos.approvedAt : tos.returnedAt) : ''
            };
        })
        .filter(row => row.status === selectedStatus);

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

    return (
        <div className={styles['courses-table']}>

            <div className={styles.header}>
                <h2>ASSIGNED TABLE OF SPECIFICATIONS</h2>
                <div className={styles.filterA}>
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
                <div className={styles.fill}></div>

                <div className={'filter-container'}>
                    <p>Filter by <strong>Status</strong>:</p>
                    <select onChange={e => setSelectedStatus(e.target.value)} value={selectedStatus}>
                        <option value="pending">Pending</option>
                        <option value="returned">Returned</option>
                        <option value="approved">Approved</option>
                    </select>
                </div>
            </div>

                        <div className={styles['table-container']}>
                {loading ? (
                    <div className={styles.loadingCell}>Loading courses...</div>
                ) : errorMsg ? (
                    <div className={styles.loadingCell} style={{color: 'red'}}>{errorMsg}</div>
                ) : displayedCourses.length === 0 ? (
                    <div className={styles.loadingCell} style={{color: '#6B7280'}}>No courses in this status.</div>
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
                    {displayedCourses
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={200}>{selectedStatus === 'pending' ? row.dateSubmitted : row.dateStatus}</td>
                                <td width={130}>
                                    {row.code}
                                    {row.isOverdue && (
                                        <span style={{ marginLeft: 8, padding: '2px 6px', fontSize: 11, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', borderRadius: 4 }}>
                                            Overdue
                                        </span>
                                    )}
                                </td>
                                <td width={300}>{row.name}</td>
                                <td width={200}>{row.instructor}</td>
                                <td className={styles.fill}>
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


