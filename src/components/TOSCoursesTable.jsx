import React, {useState} from 'react';
import {Link} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight } from 'react-feather';
import { syllabiData } from '../data/syllabiData';

const TOSCoursesTable = ({}) => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];
    const temp = ['Midterm', 'Finals'];
    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }
    const Courses = syllabiData.map(s => ({
        code: s.code,
        name: s.name,
        update: s.update || 'TBA',
        status: s.status || 'DRAFT',
        exported: s.exported || ''
    }));

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