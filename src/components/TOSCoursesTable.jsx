import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Download } from 'react-feather';
import { fetchCourses } from '../services/api.js';
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

    const [selectedStatus, setSelectedStatus] = useState(location.state?.initialStatus || 'draft');
    const [examType, setExamType] = useState('Midterm');
    const [schoolYear, setSchoolYear] = useState(String(currentYear));
    const [semester, setSemester] = useState('1st Semester');
    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value)
    }

        const displayedCourses = courses.map(c => {
        const tos = examType === 'Midterm' ? c.midtermTos : c.finalsTos;
        const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';
        return {
            ...c,
            status: tos ? tos.status : 'draft',
            dateAssigned: fmt(c.created_at) || '',
            update: fmt(c.updated_at) || '',
            dateSubmitted: tos ? fmt(tos.submittedAt) : '',
            dateStatus: tos ? fmt(tos.returnedAt || tos.approvedAt) : ''
        };
    }).filter(c => {
        if (selectedStatus === 'draft' && c.status !== 'draft') return false;
        if (selectedStatus === 'pending' && c.status !== 'pending') return false;
        if (selectedStatus === 'returned' && c.status !== 'returned') return false;
        if (selectedStatus === 'approved' && c.status !== 'approved') return false;
        return true;
    });

    const nonDraft = selectedStatus === 'pending' || selectedStatus === 'approved' || selectedStatus === 'returned';
    const statusHeader = selectedStatus === 'returned' ? 'DATE RETURNED' : selectedStatus === 'approved' ? 'DATE APPROVED' : '';

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
                    <select onChange={handleStatusChange} value={selectedStatus}>
                        <option value="draft">Draft</option>
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
                        <th width={170}>{nonDraft ? 'DATE SUBMITTED' : 'DATE ASSIGNED'}</th>
                        <th width={130}>CODE</th>
                        <th width={320}>COURSE NAME</th>
                        {nonDraft && selectedStatus !== 'pending' && <th width={200}>{statusHeader}</th>}
                        {!nonDraft && <th width={200}>LAST UPDATED</th>}
                        <th className={styles.fill}></th>
                    </tr>
                    </thead>

                    <tbody>
                    {displayedCourses
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={170}>{nonDraft ? row.dateSubmitted : row.dateAssigned}</td>
                                <td width={130}>{row.code}</td>
                                <td width={320}>{row.name}</td>
                                {nonDraft && selectedStatus !== 'pending' && <td width={200}>{row.dateStatus || row.dateSubmitted}</td>}
                                {!nonDraft && <td width={200}>{row.update}</td>}
                                <td className={styles.fill}>
                                    {selectedStatus === 'approved' && (
                                        <button className={styles.exportBtn} onClick={() => console.log('Export', row.code)}>
                                            Export <Download size={16} />
                                        </button>
                                    )}
                                    {row.status === 'draft' ? (
                                        (examType === 'Midterm' ? row.midtermLock?.locked : row.finalsLock?.locked) ? (
                                            <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', cursor: 'not-allowed' }}>
                                                {examType === 'Midterm' ? row.midtermLock.reason : row.finalsLock.reason}
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



