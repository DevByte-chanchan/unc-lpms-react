import {useState} from 'react';
import {Link} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, CheckCircle, Clock, XCircle } from 'react-feather';
import { syllabiData } from '../data/syllabiData';

const CoursesTable = ({}) => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];

    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const Courses = [
        { code: 'BSCS313L', name: 'Human & Computer Interaction', update: 'Aug 01, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS212L', name: 'Web Development I', update: 'Sept 15, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS111L', name: 'Fundamentals of Programming', update: 'Aug 05, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS214L', name: 'Data Structures and Algorithms', update: 'Sept 20, 2025', status: 'PPR', approved: '' },
        { code: 'BSCS315L', name: 'Operating Systems', update: 'Oct 02, 2025', status: 'APPROVED', approved: 'Oct 10, 2025' },
        { code: 'BSCS321L', name: 'Database Management Systems', update: 'Oct 05, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS322L', name: 'Software Engineering', update: 'Oct 12, 2025', status: 'AAAP', approved: '' },
        { code: 'BSCS331L', name: 'Computer Networks', update: 'Oct 18, 2025', status: 'APPROVED', approved: 'Oct 25, 2025' },
        { code: 'BSCS341L', name: 'Artificial Intelligence', update: 'Nov 01, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS351L', name: 'Cybersecurity Fundamentals', update: 'Nov 10, 2025', status: 'PAR', approved: '' },
    ];




    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const handleStatusChange = (e) => {setSelectedStatus(e.target.value)}


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
                    <select onChange={handleStatusChange} >
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING">Pending</option>
                        <option value="APPROVED">Approved</option>
                    </select>
                </div>
            </div>

            <div className={styles['table-container']}>
                {(selectedStatus === 'DRAFT' ||
                    selectedStatus === 'APPROVED') &&
                    <table>
                        <thead>
                        <tr>
                            <th width={150}>CODE</th>
                            <th width={350}>COURSE NAME</th>
                            {selectedStatus === 'DRAFT'
                                ?<th width={200}>LAST UPDATED</th>
                                :<th width={200}>DATE APPROVED</th>
                            }
                            <th width={120}>STATUS</th>
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>

                        <tbody>
                        {Courses
                            .filter(row => row.status === selectedStatus)
                            .map((row, index) => (
                                <tr key={index}>
                                    <td width={150}>{row.code}</td>
                                    <td width={350}>{row.name}</td>

                                    {selectedStatus === 'DRAFT'
                                        ? <td width={200}>{row.update}</td>
                                        : <td width={200}>{row.approved}</td>}

                                    <td width={120}>{row.status}</td>
                                    <td className={styles.fill}>
                                        <Link className={'actionLink'} to={`/courses/${row.code}`}>
                                            {row.status === 'DRAFT' ? 'Compose' : 'Open'}
                                            <ChevronRight size={18} />
                                        </Link>

                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
                {(selectedStatus !== 'DRAFT' &&
                        selectedStatus !== 'APPROVED') &&
                    <table>
                        <thead>
                            <tr>
                                <th width={150}>CODE</th>
                                <th width={300}>COURSE NAME</th>
                                <th width={160}>DATE SUBMITTED</th>
                                <th className={styles.status} width={800}>STATUS</th>
                                <th className={styles.fill}></th>
                            </tr>
                            <tr className={styles['sub-column']}>
                                <th width={150}></th>
                                <th width={300}></th>
                                <th width={160}></th>
                                <th style={{borderLeft: "5px solid white"}} className={styles.lighten} width={200}>Library Director</th>
                                <th className={styles.lighten} width={200}>Industry Consultant</th>
                                <th className={styles.lighten} width={200}>Program Head</th>
                                <th style={{borderRight: "5px solid white"}} className={styles.lighten} width={200}>Dean</th>
                                <th className={styles.fill}></th>
                            </tr>
                        </thead>


                        <tbody>
                        {Courses
                            .filter(row => row.status !== 'DRAFT' && row.status !== 'APPROVED')
                            .map((row, index) => {

                                // 1. Split status string into array (e.g. "PPR" -> ['P','P','R'])
                                const s = row.status.split('');

                                // 2. Check for 'R' to determine Action
                                const isReturned = row.status.includes('R');

                                // 3. Helper to map Char to Text
                                const getStatusText = (char) => {
                                    if (char === 'A') return 'Approved';
                                    if (char === 'P') return 'Pending';
                                    if (char === 'R') return 'Returned';
                                    return ''; // Returns empty if char (index 3) doesn't exist
                                };

                                return (
                                    <tr key={index}>
                                        <td width={150}>{row.code}</td>
                                        <td width={300}>{row.name}</td>
                                        <td width={160}>{row.update}</td>

                                        {/* Library Director */}
                                        <td className={styles.lighten} width={200}>
                                            {getStatusText(s[0])}
                                        </td>

                                        {/* Industry Consultant */}
                                        <td className={styles.lighten} width={200}>
                                            {getStatusText(s[1])}
                                        </td>

                                        {/* Program Head */}
                                        <td className={styles.lighten} width={200}>
                                            {getStatusText(s[2])}
                                        </td>

                                        {/* Dean (Only appears if string length > 3) */}
                                        <td className={styles.lighten} width={200}>
                                            {getStatusText(s[3])}
                                        </td>

                                        {/* Action Column */}
                                        <td className={styles.fill}>
                                            <Link className={'actionLink'} to={`/courses/${row.code}`}>
                                                {isReturned ? (
                                                    <>
                                                        Update
                                                        <Edit size={18} />
                                                    </>
                                                ) : (
                                                    <>
                                                        View
                                                        <ChevronRight size={18} />
                                                    </>
                                                )}
                                            </Link>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                }

            </div>

        </div>
    );
};

export default CoursesTable;