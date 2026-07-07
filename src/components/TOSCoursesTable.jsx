import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight } from 'react-feather';
import { fetchCourses } from '../services/api.js';
const TOSCoursesTable = ({}) => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Semester', '2nd Semester'];
    const temp = ['Midterm', 'Finals'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }
    const nortonCourses = new Set(['BSCS111L','BSCS212L','BSCS313L','BSCS321L','BSCS221L','BSCS341L','BSCS342L','BSCS214L','BSCS222L','BSCS223L','BSCS314L','BSCS323L']);

    const draftCourses = [
        { code: 'BSCS313L', name: 'Human & Computer Interaction',    dateAssigned: 'Jun 03, 2026', update: 'Jun 03, 2026', status: 'draft' },
        { code: 'BSCS212L', name: 'Web Development I',               dateAssigned: 'Jun 02, 2026', update: 'Jun 05, 2026', status: 'draft' },
        { code: 'BSCS111L', name: 'Fundamentals of Programming',     dateAssigned: 'Jun 01, 2026', update: 'Jun 04, 2026', status: 'draft' },
        { code: 'BSCS321L', name: 'Database Management Systems',     dateAssigned: 'Jun 04, 2026', update: 'Jun 07, 2026', status: 'draft' },
    ];
    const pendingCourses = [
        { code: 'BSCS221L', name: 'Object-Oriented Programming',     dateSubmitted: 'Jun 10, 2026', status: 'pending' },
        { code: 'BSCS341L', name: 'Artificial Intelligence',         dateSubmitted: 'Jun 11, 2026', status: 'pending' },
        { code: 'BSCS342L', name: 'Machine Learning Fundamentals',   dateSubmitted: 'Jun 12, 2026', status: 'pending' },
    ];
    const returnedCourses = [
        { code: 'BSCS214L', name: 'Data Structures and Algorithms',   dateSubmitted: 'Jun 09, 2026', dateStatus: 'Jun 18, 2026', status: 'returned' },
        { code: 'BSCS222L', name: 'Discrete Structures 2',           dateSubmitted: 'Jun 10, 2026', dateStatus: 'Jun 19, 2026', status: 'returned' },
    ];
    const approvedCourses = [
        { code: 'BSCS223L', name: 'Web Development II',              dateSubmitted: 'Jun 09, 2026', dateStatus: 'Jun 16, 2026', status: 'approved' },
        { code: 'BSCS314L', name: 'Data Communications',             dateSubmitted: 'Jun 10, 2026', dateStatus: 'Jun 17, 2026', status: 'approved' },
        { code: 'BSCS323L', name: 'Systems Analysis and Design',     dateSubmitted: 'Jun 11, 2026', dateStatus: 'Jun 19, 2026', status: 'approved' },
    ];
    const fallbackCourses = [...draftCourses, ...pendingCourses, ...returnedCourses, ...approvedCourses];
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const location = useLocation();
    useEffect(() => {
        const navUpdate = location.state?.tosStatusUpdate;
        fetchCourses()
            .then(data => {
                let result;
                if (data && data.length) result = data.filter(c => nortonCourses.has(c.code));
                else result = fallbackCourses;
                if (navUpdate) {
                    result = result.map(c =>
                        c.name === navUpdate.courseName ? { ...c, status: navUpdate.newStatus } : c
                    );
                }
                setCourses(result);
            })
            .catch(() => {
                let result = fallbackCourses;
                if (navUpdate) {
                    result = result.map(c =>
                        c.name === navUpdate.courseName ? { ...c, status: navUpdate.newStatus } : c
                    );
                }
                setCourses(result);
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
                        <option key="Finals" value="Finals">Finals</option>
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
                    {courses
                        .filter(row => row.status === selectedStatus)
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={170}>{nonDraft ? row.dateSubmitted : row.dateAssigned}</td>
                                <td width={130}>{row.code}</td>
                                <td width={320}>{row.name}</td>
                                {nonDraft && selectedStatus !== 'pending' && <td width={200}>{row.dateStatus || row.dateSubmitted}</td>}
                                {!nonDraft && <td width={200}>{row.update}</td>}
                                <td className={styles.fill}>
                                    {row.status === 'draft' ? (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                            Compose
                                            <ChevronRight size={18} />
                                        </Link>
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
