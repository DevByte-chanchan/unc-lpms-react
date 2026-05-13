import React, {useState} from 'react';
import {Link} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight } from 'react-feather';
const TOSCoursesTable = ({}) => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const temp = ['Midterm', 'Finals'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }
    const Courses = [
        { code: 'BSCS313L', name: 'Human & Computer Interaction', update: 'Sept 01, 2025', status: 'DRAFT',    exported: '' },
        { code: 'BSCS212L', name: 'Web Development I',            update: 'Aug 15, 2025', status: 'DRAFT',    exported: '' },
        { code: 'BSCS111L', name: 'Fundamentals of Programming',  update: 'Aug 25, 2025', status: 'DRAFT',    exported: '' },
        { code: 'BSCS214L', name: 'Data Structures and Algorithms', update: 'Sept 20, 2025', status: 'EXPORTED', exported: 'Sept 28, 2025' },
        { code: 'BSCS315L', name: 'Operating Systems',             update: 'Oct 02, 2025', status: 'EXPORTED', exported: 'Oct 10, 2025' },
        { code: 'BSCS321L', name: 'Database Management Systems',   update: 'Sept 05, 2025', status: 'DRAFT',    exported: '' },
        { code: 'BSCS322L', name: 'Software Engineering',          update: 'Sept 12, 2025', status: 'EXPORTED', exported: 'Sept 22, 2025' },
        { code: 'BSCS331L', name: 'Computer Networks',             update: 'Sept 18, 2025', status: 'EXPORTED', exported: 'Oct 25, 2025' },
        { code: 'BSCS341L', name: 'Artificial Intelligence',       update: 'Sept 01, 2025', status: 'DRAFT',    exported: '' },
        { code: 'BSCS351L', name: 'Cybersecurity Fundamentals',    update: 'Sept 10, 2025', status: 'EXPORTED', exported: 'Sept 30, 2025' },
    ];

    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const handleStatusChange = (e) => {
        setSelectedStatus(e.target.value)
    }

    return (
        <div className={styles['courses-table']}>

            <div className={styles.header}>
                <h2>ASSIGNED TOS</h2>
                <div className={styles.filterA}>
                    <select className={styles['header-select']}>
                        {yearOptions}
                    </select>
                    <select className={styles['header-select']}>
                        {semOptions.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </select>
                    <select className={styles['header-select']}>
                        {temp.map(sem => (
                            <option key={sem} value={sem}>{sem}</option>
                        ))}
                    </select>
                </div>
                <div className={styles.fill}></div>

                <div className={'filter-container'}>
                    <p>Filter by <strong>Status</strong>:</p>
                    <select onChange={handleStatusChange} >
                        <option value="DRAFT">Draft</option>
                        <option value="EXPORTED">Exported</option>
                    </select>
                </div>
            </div>

            <div className={styles['table-container']}>
                <table>
                    <thead>
                    <tr>
                        <th width={150}>CODE</th>
                        <th width={350}>COURSE NAME</th>

                        {selectedStatus === 'DRAFT'
                            ? <th width={200}>LAST UPDATED</th>
                            : <th width={200}>DATE EXPORTED</th>
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
                                    : <td width={200}>{row.exported}</td>
                                }

                                <td width={120}>{row.status}</td>

                                <td className={styles.fill}>
                                    <Link className="actionLink" to={`/tos/${row.name}`}>
                                        {row.status === 'DRAFT' ? 'Compose' : 'Open'}
                                        <ChevronRight size={18} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TOSCoursesTable;