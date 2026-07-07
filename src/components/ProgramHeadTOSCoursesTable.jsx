import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight } from 'react-feather';
import { fetchCourses } from '../services/api.js';

const ProgramHeadTOSCoursesTable = () => {
    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Semester', '2nd Semester'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }
    const fallbackCourses = [
        // Pending — Norton
        { code: 'BSCS221L', name: 'Object-Oriented Programming',    instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 22, 2025', dateStatus: '', status: 'pending' },
        { code: 'BSCS341L', name: 'Artificial Intelligence',       instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 18, 2025', dateStatus: '', status: 'pending' },
        { code: 'BSCS342L', name: 'Machine Learning Fundamentals',  instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 25, 2025', dateStatus: '', status: 'pending' },
        // Pending — others
        { code: 'BSCS312L', name: 'Information Management',          instructor: 'DIAZ, ROSA',      dateSubmitted: 'Oct 21, 2025', dateStatus: '', status: 'pending' },
        { code: 'BSCS331L', name: 'Computer Networks',              instructor: 'JEFFORDS, TERRY', dateSubmitted: 'Oct 22, 2025', dateStatus: '', status: 'pending' },
        // Returned — Norton
        { code: 'BSCS214L', name: 'Data Structures and Algorithms', instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 10, 2025', dateStatus: 'Oct 20, 2025', status: 'returned' },
        { code: 'BSCS222L', name: 'Discrete Structures 2',          instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 16, 2025', dateStatus: 'Oct 23, 2025', status: 'returned' },
        // Returned — others
        { code: 'BSCS324L', name: 'Advanced Software Engineering', instructor: 'DIAZ, ROSA',      dateSubmitted: 'Oct 24, 2025', dateStatus: 'Oct 29, 2025', status: 'returned' },
        // Approved — Norton
        { code: 'BSCS223L', name: 'Web Development II',             instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 11, 2025', dateStatus: 'Oct 18, 2025', status: 'approved' },
        { code: 'BSCS314L', name: 'Data Communications',             instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 12, 2025', dateStatus: 'Oct 19, 2025', status: 'approved' },
        { code: 'BSCS323L', name: 'Systems Analysis and Design',    instructor: 'NORTON, MONICA',   dateSubmitted: 'Oct 13, 2025', dateStatus: 'Oct 20, 2025', status: 'approved' },
        // Approved — others
        { code: 'BSCS332L', name: 'Network Security',               instructor: 'DIAZ, ROSA',      dateSubmitted: 'Oct 16, 2025', dateStatus: 'Oct 23, 2025', status: 'approved' },
        { code: 'BSCS413L', name: 'Capstone Project 2',             instructor: 'JEFFORDS, TERRY', dateSubmitted: 'Oct 17, 2025', dateStatus: 'Oct 25, 2025', status: 'approved' },
        { code: 'BSCS315L', name: 'Operating Systems',             instructor: 'DIAZ, ROSA',      dateSubmitted: 'Oct 12, 2025', dateStatus: 'Oct 19, 2025', status: 'approved' },
    ];
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const navUpdate = location.state?.tosStatusUpdate;
        fetchCourses()
            .then(apiCourses => {
                const apiMap = {};
                if (apiCourses && apiCourses.length) {
                    apiCourses.forEach(c => { apiMap[c.code] = c; });
                }
                const seen = new Set();
                let result = fallbackCourses.map(fc => {
                    const api = apiMap[fc.code];
                    seen.add(fc.code);
                    if (!api) return fc;
                    return {
                        ...fc,
                        instructor: api.instructor || fc.instructor,
                        status: api.status || fc.status,
                        dateSubmitted: api.dateSubmitted || fc.dateSubmitted,
                        dateStatus: api.dateStatus || fc.dateStatus,
                    };
                });
                for (const code in apiMap) {
                    if (!seen.has(code)) {
                        const api = apiMap[code];
                        result.push({
                            code: api.code,
                            name: api.name,
                            instructor: api.instructor || '\u2014',
                            dateSubmitted: api.dateSubmitted || '',
                            dateStatus: api.dateStatus || '',
                            status: api.status || 'draft',
                        });
                    }
                }
                if (navUpdate) {
                    result = result.map(c =>
                        c.code === navUpdate.courseCode ? { ...c, status: navUpdate.newStatus } : c
                    );
                }
                setCourses(result);
                setLoading(false);
            })
            .catch(() => {
                let result = fallbackCourses;
                if (navUpdate) {
                    result = result.map(c =>
                        c.code === navUpdate.courseCode ? { ...c, status: navUpdate.newStatus } : c
                    );
                }
                setCourses(result);
                setLoading(false);
            });
    }, []);

    const location = useLocation();
    const [selectedStatus, setSelectedStatus] = useState(location.state?.initialStatus || 'pending');
    const [examType, setExamType] = useState('Midterm');
    const [schoolYear, setSchoolYear] = useState(String(currentYear));
    const [semester, setSemester] = useState('1st Semester');
    const statusHeader = selectedStatus === 'returned' ? 'DATE RETURNED' : selectedStatus === 'approved' ? 'DATE APPROVED' : 'DATE SUBMITTED';

    return (
        <div className={styles['courses-table']}>

            <div className={styles.header}>
                <h2>SUBMITTED TABLE OF SPECIFICATIONS</h2>
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
                ) : (
                <table>
                    <thead>
                    <tr>
                        <th width={130}>CODE</th>
                        <th width={300}>COURSE NAME</th>
                        <th width={200}>INSTRUCTOR</th>
                        <th width={200}>{statusHeader}</th>
                        <th className={styles.fill}></th>
                    </tr>
                    </thead>

                    <tbody>
                    {courses
                        .filter(row => row.status === selectedStatus)
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={130}>{row.code}</td>
                                <td width={300}>{row.name}</td>
                                <td width={200}>{row.instructor}</td>
                                <td width={200}>{selectedStatus === 'pending' ? row.dateSubmitted : row.dateStatus}</td>
                                <td className={styles.fill}>
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
