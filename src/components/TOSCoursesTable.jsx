import React, {useState, useEffect} from 'react';
import {Link, useLocation} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight } from 'react-feather';
import { fetchCourses } from '../services/api.js';
const TOSCoursesTable = ({}) => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const temp = ['Midterm', 'Finals'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }
    const fallbackCourses = [
        { code: 'BSCS313L', name: 'Human & Computer Interaction', dateAssigned: 'Jun 03, 2026', update: 'Sept 01, 2025', status: 'draft',    exported: '' },
        { code: 'BSCS212L', name: 'Web Development I',            dateAssigned: 'Jun 02, 2026', update: 'Aug 15, 2025', status: 'draft',    exported: '' },
        { code: 'BSCS111L', name: 'Fundamentals of Programming',  dateAssigned: 'Jun 01, 2026', update: 'Aug 25, 2025', status: 'draft',    exported: '' },
        { code: 'BSCS214L', name: 'Data Structures and Algorithms', dateAssigned: 'Jun 04, 2026', update: 'Sept 20, 2025', status: 'pending', exported: '' },
        { code: 'BSCS315L', name: 'Operating Systems',             dateAssigned: 'Jun 05, 2026', update: 'Oct 02, 2025', status: 'approved', exported: 'Oct 10, 2025' },
        { code: 'BSCS321L', name: 'Database Management Systems',   dateAssigned: 'Jun 08, 2026', update: 'Sept 05, 2025', status: 'draft',    exported: '' },
        { code: 'BSCS322L', name: 'Software Engineering',          dateAssigned: 'Jun 09, 2026', update: 'Sept 12, 2025', status: 'pending', exported: '' },
        { code: 'BSCS331L', name: 'Computer Networks',             dateAssigned: 'Jun 10, 2026', update: 'Sept 18, 2025', status: 'approved', exported: 'Oct 25, 2025' },
        { code: 'BSCS341L', name: 'Artificial Intelligence',       dateAssigned: 'Jun 11, 2026', update: 'Sept 01, 2025', status: 'draft',    exported: '' },
        { code: 'BSCS351L', name: 'Cybersecurity Fundamentals',    dateAssigned: 'Jun 12, 2026', update: 'Sept 10, 2025', status: 'pending', exported: '' },
    ];
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses()
            .then(data => {
                if (data && data.length) setCourses(data);
                else setCourses(fallbackCourses);
            })
            .catch(() => setCourses(fallbackCourses))
            .finally(() => setLoading(false));
    }, []);

    const location = useLocation();
    useEffect(() => {
        const update = location.state?.tosStatusUpdate;
        if (update) {
            setCourses(prev => prev.map(c =>
                c.name === update.courseName ? { ...c, status: update.newStatus } : c
            ));
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const [selectedStatus, setSelectedStatus] = useState('draft');
    const [examType, setExamType] = useState('Midterm');
    const [schoolYear, setSchoolYear] = useState(String(currentYear));
    const [semester, setSemester] = useState('1st Sem');
    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value)
    }

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
                    <select onChange={handleStatusChange} >
                        <option value="draft">Draft</option>
                        <option value="pending" disabled>Pending</option>
                        <option value="approved" disabled>Approved</option>
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
                        <th width={170}>DATE ASSIGNED</th>
                        <th width={130}>CODE</th>
                        <th width={320}>COURSE NAME</th>
                        <th width={200}>LAST UPDATED</th>
                        <th className={styles.fill}></th>
                    </tr>
                    </thead>

                    <tbody>
                    {courses
                        .filter(row => row.status === selectedStatus)
                        .map((row, index) => (
                            <tr key={index}>
                                <td width={170}>{row.dateAssigned}</td>
                                <td width={130}>{row.code}</td>
                                <td width={320}>{row.name}</td>
                                <td width={200}>{row.update}</td>
                                <td className={styles.fill}>
                                    {row.status === 'draft' ? (
                                        <Link className="actionLink" to={`/tos/${row.code}`} state={{ tosStatus: row.status, courseName: row.name, examType, schoolYear, semester }}>
                                            Compose
                                            <ChevronRight size={18} />
                                        </Link>
                                    ) : (
                                        <span className={styles.disabledAction}>
                                            {row.status === 'pending' ? 'Pending' : 'Approved'}
                                        </span>
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
