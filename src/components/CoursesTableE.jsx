import {useState} from 'react';
import {Link} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, CheckCircle, Clock, XCircle, Download } from 'react-feather';
import { syllabiData } from '../data/syllabiData';

const CoursesTable = ({}) => {

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];

    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    // Merged Data: Includes 'needsUpdate' from the upcoming version
    const Courses = [
        { code: 'BSCS313L', name: 'Human & Computer Interaction', update: 'Aug 01, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS212L', name: 'Web Development I', update: 'Sept 15, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS111L', name: 'Fundamentals of Programming', update: 'Aug 05, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS214L', name: 'Data Structures and Algorithms', update: 'Sept 20, 2025', status: 'PPR', approved: '', needsUpdate: true },
        { code: 'BSCS315L', name: 'Operating Systems', update: 'Oct 02, 2025', status: 'APPROVED', approved: 'Oct 10, 2025' },
        { code: 'BSCS321L', name: 'Database Management Systems', update: 'Oct 05, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS322L', name: 'Software Engineering', update: 'Oct 12, 2025', status: 'AAAP', approved: '' },
        { code: 'BSCS331L', name: 'Computer Networks', update: 'Oct 18, 2025', status: 'APPROVED', approved: 'Oct 25, 2025' },
        { code: 'BSCS341L', name: 'Artificial Intelligence', update: 'Nov 01, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS351L', name: 'Cybersecurity Fundamentals', update: 'Nov 10, 2025', status: 'PAR', approved: '' },
    ];

    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const handleStatusChange = (e) => {setSelectedStatus(e.target.value)}

    // --- NEW FEATURE: PDF DATA RETRIEVAL ---
    const getSyllabusData = (courseCode) => {
        const foundCourse = syllabiData.find(c => c.code === courseCode);
        if (foundCourse) return foundCourse;
        // Fallback Mock Data if not found in syllabiData
        return {
            code: courseCode,
            name: 'Course Name',
            credits: '3',
            contact: '3',
            prerequisites: 'N/A',
            class: 'Professional Courses',
            cmo: 'N/A',
            revision: '0',
            year: 'N/A',
            sem: 'N/A',
            description: 'Description unavailable.',
            courseOutcomes: [],
            references: [],
            gradingSystem: [],
            ilos: [],
            topics: []
        };
    }

    // --- NEW FEATURE: PDF GENERATION ---
    const generatePDF = (course) => {
        const syllabus = getSyllabusData(course.code);

        const calculateTotal = (period) => {
            let total = 0;
            if(syllabus.gradingSystem) {
                syllabus.gradingSystem.forEach(group => {
                    if (group.ilos) {
                        group.ilos.forEach(ilo => {
                            total += Number(ilo.weight?.[period] || 0);
                        })
                    }
                })
            }
            return total;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${course.code}_syllabus_report</title>
                <style>
                    @page { size: A4; margin: 15mm; }
                    body { font-family: Arial, sans-serif; font-size: 10pt; color: #333; line-height: 1.4; }
                    h1 { font-size: 18pt; border-bottom: 1px solid black; padding-bottom: 8px; margin-bottom: 15px; text-align: center; }
                    h2 { font-size: 13pt; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid black; padding-bottom: 5px; }
                    .section { margin-bottom: 20px; page-break-inside: avoid; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    th { background-color: white; color: black; padding: 8px; text-align: left; font-size: 9pt; font-weight: bold; border: 1px solid black; }
                    td { padding: 6px 8px; border: 1px solid black; font-size: 9pt; vertical-align: top; }
                    .bold { font-weight: 600; }
                    .center { text-align: center; }
                    .total-row { background-color: white !important; font-weight: bold; }
                    .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid black; font-size: 8pt; color: #666; text-align: center; }
                </style>
            </head>
            <body>
                <h1>COURSE SYLLABUS REPORT</h1>
                <div class="section">
                    <h2>Course Details</h2>
                    <table>
                        <tr><th>Course No.</th><td>${syllabus.code}</td></tr>
                        <tr><th>Course Title</th><td class="bold">${syllabus.name}</td></tr>
                        <tr><th>Description</th><td>${syllabus.description}</td></tr>
                    </table>
                </div>
                <div class="footer">
                    <p>Generated on: ${new Date().toLocaleDateString()}</p>
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '', 'width=1024,height=768');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
    }

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

                {/* --- DRAFT TABLE --- */}
                {selectedStatus === 'DRAFT' &&
                    <table>
                        <thead>
                        <tr>
                            <th width={150}>CODE</th>
                            <th width={350}>COURSE NAME</th>
                            <th width={200}>LAST UPDATED</th>
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
                                    <td width={200}>{row.update}</td>
                                    <td width={120}>{row.status}</td>
                                    <td className={styles.fill}>
                                        {/* FIX APPLIED: Uses dynamic row.code instead of hardcoded ID */}
                                        <Link className={'actionLink'} to={`/courses/${row.code}`}>
                                            Compose
                                            <ChevronRight size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }

                {/* --- APPROVED TABLE (With new Export Feature) --- */}
                {selectedStatus === 'APPROVED' &&
                    <table>
                        <thead>
                        <tr>
                            <th width={150}>CODE</th>
                            <th width={350}>COURSE NAME</th>
                            <th width={200}>DATE SUBMITTED</th>
                            <th width={200}>DATE APPROVED</th>
                            <th width={120}>STATUS</th>
                            <th width={100}>EXPORT</th>
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
                                    <td width={200}>{row.update}</td>
                                    <td width={200}>{row.approved}</td>
                                    <td width={120}>{row.status}</td>
                                    <td width={100}>
                                        <button
                                            onClick={() => generatePDF(row)}
                                            className={'actionLink'}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            Export <Download size={18} />
                                        </button>
                                    </td>
                                    <td className={styles.fill}>
                                        <Link className={'actionLink'} to={`/courses/${row.code}?status=approved`}>
                                            View
                                            <ChevronRight size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }

                {/* --- PENDING/RETURNED TABLE (With new Revisions Logic) --- */}
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

                                // 2. Check for 'R' or explicit flag to determine Action
                                // Merged Logic: Checks for explicit needsUpdate flag OR 'R' status
                                const isReturned = !!row.needsUpdate || row.status.includes('R');

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
                                            {/* Merged Logic: Points Updates to Revisions, View to Courses */}
                                            {(() => {
                                                const label = isReturned ? 'Update' : 'View'
                                                const to = label === 'Update' ? `/revisions/${row.code}` : `/courses/${row.code}`
                                                return (
                                                    <Link className={'actionLink'} to={to}>
                                                        {label}
                                                        {label === 'Update' ? <Edit size={18} /> : <ChevronRight size={18} />}
                                                    </Link>
                                                )
                                            })()}
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