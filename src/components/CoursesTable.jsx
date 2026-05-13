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

    const Courses = [
        { code: 'BSCS313L', name: 'Human & Computer Interaction', update: 'Aug 01, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS212L', name: 'Web Development I', update: 'Sept 15, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS111L', name: 'Fundamentals of Programming', update: 'Aug 05, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS313L', name: 'Human & Computer Interaction', update: 'Sept 20, 2025', status: 'PPR', approved: '' },
        { code: 'BSCS315L', name: 'Operating Systems', update: 'Oct 02, 2025', status: 'APPROVED', approved: 'Oct 10, 2025' },
        { code: 'BSCS321L', name: 'Database Management Systems', update: 'Oct 05, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS322L', name: 'Software Engineering', update: 'Oct 12, 2025', status: 'AAAP', approved: '' },
        { code: 'BSCS331L', name: 'Computer Networks', update: 'Oct 18, 2025', status: 'APPROVED', approved: 'Oct 25, 2025' },
        { code: 'BSCS341L', name: 'Artificial Intelligence', update: 'Nov 01, 2025', status: 'DRAFT', approved: '' },
        { code: 'BSCS351L', name: 'Cybersecurity Fundamentals', update: 'Nov 10, 2025', status: 'PAR', approved: '' },
    ];




    const [selectedStatus, setSelectedStatus] = useState('DRAFT');
    const handleStatusChange = (e) => {setSelectedStatus(e.target.value)}

    const getSyllabusData = (courseCode) => {
        return {
            code: courseCode,
            name: 'Human & Computer Interaction',
            credits: '2 LEC, 1 LAB',
            contact: '3',
            prerequisites: 'BCS222L Web Development 2',
            class: 'Professional Courses',
            cmo: '25 S, 2015',
            revision: '0',
            year: 'THIRD YEAR',
            sem: '1st Semester',
            description: 'This course explores the principles and practices of Human-Computer Interaction (HCI), focusing on how people engage with digital systems and how to design technology that enhances user experience.',
            courseOutcomes: [
                {
                    id: 'CO1',
                    description: 'Apply core concepts, theories, and principles of HCI',
                    poMappings: ['E', '', 'I', '', '', 'E', '', '', 'I']
                },
                {
                    id: 'CO2',
                    description: 'User-Centered Design principles and ISO 9241-210 standards',
                    poMappings: ['', 'E', '', '', '', 'E', '', 'I', '']
                },
            ],
            references: [
                { id: 'TB1', type: 'Textbook', title: 'The Design of Everyday Things', authors: 'Don Norman', year: 2013, isbn: '978-0465050659' },
                { id: 'OE1', type: 'Open Educational Resources', title: 'The Encyclopedia of HCI', authors: 'Mads Soegaard', year: 2014, link: 'https://interaction-design.org' },
                { id: 'OR1', type: 'Online Resources', title: '10 Usability Heuristics', authors: 'Jakob Nielsen', year: 2020, link: 'https://nngroup.com' },
            ],
            gradingSystem: [
                {
                    co: "CO1",
                    ilos: [
                        { id: "ILO1", assessments: ["Intro to Heuristics Brief"], weight: { prelim: "30", midterm: "", semi: "", final: "" }, minPassing: "60" },
                        { id: "ILO2", assessments: ["Persona Workshop"], weight: { prelim: "40", midterm: "", semi: "", final: "" }, minPassing: "60" },
                    ]
                },
                {
                    co: "CO2",
                    ilos: [
                        { id: "ILO1", assessments: ["UI Evaluation"], weight: { prelim: "", midterm: "30", semi: "", final: "" }, minPassing: "60" },
                    ]
                },
            ],
            ilos: [
                {
                    id: "CO1-ILO1",
                    intendedLearningOutcome: "Analyze the relationship between cognitive psychology and HCI",
                    deliveryWeek: "Week 1",
                    allocatedTime: "3 hours",
                    topics: ["Introduction to HCI & Cognitive Foundations"],
                    references: ["TB1 - The Design of Everyday Things"]
                },
            ],
            topics: [
                {
                    id: "T1",
                    title: "Introduction to HCI & Cognitive Foundations",
                    subtopics: [
                        { id: "S1", value: "History and Evolution of HCI" },
                        { id: "S2", value: "Mental Models and Metaphors" }
                    ],
                    tlas: [
                        {
                            id: "TLA1",
                            classPhase: "Pre-class",
                            performedBy: "Instructor",
                            tlaName: "Foundations Lecture",
                            tlaDescription: "Overview of HCI principles",
                            laboratory: false
                        }
                    ]
                }
            ]
        }
    }

    const generatePDF = (course) => {
        const syllabus = getSyllabusData(course.code)
        
        const calculateTotal = (period) => {
            let total = 0
            syllabus.gradingSystem.forEach(group => {
                if (group.ilos) {
                    group.ilos.forEach(ilo => {
                        total += Number(ilo.weight?.[period] || 0)
                    })
                }
            })
            return total
        }

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${course.code}_syllabus_report</title>
            <style>
              @page {
                size: A4;
                margin: 15mm;
              }
              
              body {
                font-family: Arial, sans-serif;
                font-size: 10pt;
                color: #333;
                line-height: 1.4;
              }
              
              h1 {
                color: #2563eb;
                font-size: 18pt;
                border-bottom: 3px solid #2563eb;
                padding-bottom: 8px;
                margin-bottom: 15px;
                text-align: center;
              }
              
              h2 {
                color: #1e40af;
                font-size: 13pt;
                margin-top: 20px;
                margin-bottom: 10px;
                border-bottom: 2px solid #93c5fd;
                padding-bottom: 5px;
              }
              
              .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
              }
              
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                page-break-inside: auto;
              }
              
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              
              th {
                background-color: #2563eb;
                color: white;
                padding: 8px;
                text-align: left;
                font-size: 9pt;
                font-weight: bold;
                border: 1px solid #1e40af;
              }
              
              td {
                padding: 6px 8px;
                border: 1px solid #ddd;
                font-size: 9pt;
                vertical-align: top;
              }
              
              .course-details-table th {
                background-color: #f3f4f6;
                color: #374151;
                font-weight: 600;
                width: 30%;
              }
              
              .course-details-table td {
                background-color: white;
              }
              
              .desc-cell {
                background-color: #f9fafb;
                padding: 10px;
                line-height: 1.6;
              }
              
              tr:nth-child(even) td {
                background-color: #f9fafb;
              }
              
              .center {
                text-align: center;
              }
              
              .bold {
                font-weight: 600;
              }
              
              .legend {
                background-color: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 10px;
                margin-bottom: 15px;
                font-size: 9pt;
              }
              
              .legend strong {
                color: #92400e;
              }
              
              .total-row {
                background-color: #dbeafe !important;
                font-weight: bold;
              }
              
              .total-row td {
                background-color: #dbeafe !important;
                border-top: 2px solid #2563eb;
              }
              
              .footer {
                margin-top: 30px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
                font-size: 8pt;
                color: #6b7280;
                text-align: center;
              }
              
              .sub-header {
                background-color: #60a5fa !important;
                font-size: 8pt;
              }
              
              .topic-block {
                margin-bottom: 8px;
              }
              
              .topic-title {
                font-weight: 600;
                margin-bottom: 3px;
              }
              
              ul {
                margin: 3px 0;
                padding-left: 15px;
              }
              
              li {
                margin: 2px 0;
                font-size: 8.5pt;
              }
              
              .tla-group {
                margin-bottom: 10px;
              }
              
              .tla-phase {
                font-weight: 600;
                color: #1e40af;
                margin-bottom: 5px;
                font-size: 9pt;
              }
              
              .tla-item {
                margin-bottom: 6px;
                padding-left: 10px;
              }
              
              .tla-name {
                font-weight: 600;
              }
              
              .assessment-item {
                margin-bottom: 6px;
              }
            </style>
          </head>
          <body>
            <h1>COURSE SYLLABUS</h1>
            
            <!-- COURSE DETAILS -->
            <div class="section">
              <h2>Course Details</h2>
              <table class="course-details-table">
                <tr>
                  <th>Course No.</th>
                  <td>${syllabus.code}</td>
                  <th rowspan="9" style="vertical-align: top;">Course Description</th>
                </tr>
                <tr>
                  <th>Course Title</th>
                  <td class="bold">${syllabus.name}</td>
                  <td rowspan="9" class="desc-cell">${syllabus.description}</td>
                </tr>
                <tr>
                  <th>Credit</th>
                  <td>${syllabus.credits}</td>
                </tr>
                <tr>
                  <th>Contact Hours/Week</th>
                  <td>${syllabus.contact}</td>
                </tr>
                <tr>
                  <th>Pre-requisites</th>
                  <td>${syllabus.prerequisites}</td>
                </tr>
                <tr>
                  <th>Classification/Field</th>
                  <td>${syllabus.class}</td>
                </tr>
                <tr>
                  <th>CMO</th>
                  <td>${syllabus.cmo}</td>
                </tr>
                <tr>
                  <th>Syllabus Revision No.</th>
                  <td>${syllabus.revision}</td>
                </tr>
                <tr>
                  <th>Year Level</th>
                  <td>${syllabus.year}</td>
                </tr>
                <tr>
                  <th>Term</th>
                  <td>${syllabus.sem}</td>
                </tr>
              </table>
            </div>

            <!-- COURSE AND PROGRAM OUTCOME ALIGNMENT -->
            <div class="section">
              <h2>Course and Program Outcome Alignment</h2>
              <div class="legend">
                <strong>Legend:</strong> I – Introductory | E – Enabling | D – Demonstrative
              </div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 40%;">After completion of the course, the student should be able to:</th>
                    ${['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'].map(po => 
                      '<th class="center" style="width: 6%;">' + po + '</th>'
                    ).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${syllabus.courseOutcomes.map(co => 
                    '<tr><td><strong>' + co.id + ':</strong> ' + co.description + '</td>' +
                    co.poMappings.map(mapping => '<td class="center">' + mapping + '</td>').join('') +
                    '</tr>'
                  ).join('')}
                </tbody>
              </table>
            </div>

            <!-- REFERENCES -->
            <div class="section">
              <h2>References - Textbooks</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 8%;">ID</th>
                    <th style="width: 35%;">TITLE</th>
                    <th style="width: 25%;">AUTHOR/S</th>
                    <th style="width: 22%;">ISBN</th>
                    <th style="width: 10%;">YEAR</th>
                  </tr>
                </thead>
                <tbody>
                  ${syllabus.references.filter(r => r.type === 'Textbook').map((ref, i) => 
                    '<tr><td class="center">TB' + (i + 1) + '</td><td>' + ref.title + '</td><td>' + ref.authors + '</td><td>' + (ref.isbn || '-') + '</td><td class="center">' + ref.year + '</td></tr>'
                  ).join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>References - Online Resources</h2>
              <table>
                <thead>
                  <tr>
                    <th style="width: 8%;">ID</th>
                    <th style="width: 30%;">TITLE</th>
                    <th style="width: 22%;">AUTHOR/S</th>
                    <th style="width: 30%;">LINK</th>
                    <th style="width: 10%;">YEAR</th>
                  </tr>
                </thead>
                <tbody>
                  ${syllabus.references.filter(r => r.type === 'Online Resources').map((ref, i) => 
                    '<tr><td class="center">OR' + (i + 1) + '</td><td>' + ref.title + '</td><td>' + ref.authors + '</td><td style="word-break: break-all; font-size: 8pt;">' + ref.link + '</td><td class="center">' + ref.year + '</td></tr>'
                  ).join('')}
                </tbody>
              </table>
            </div>

            <!-- CRITERIA FOR GRADING -->
            <div class="section">
              <h2>Criteria for Grading</h2>
              <table>
                <thead>
                  <tr>
                    <th rowspan="2" style="width: 12%;">COURSE OUTCOME</th>
                    <th rowspan="2" style="width: 10%;">ILO #</th>
                    <th rowspan="2" style="width: 30%;">ASSESSMENTS</th>
                    <th colspan="4" class="center">WEIGHT %</th>
                    <th rowspan="2" style="width: 12%;">MIN PASSING %</th>
                  </tr>
                  <tr class="sub-header">
                    <th class="center" style="width: 9%;">Prelim</th>
                    <th class="center" style="width: 9%;">Midterm</th>
                    <th class="center" style="width: 9%;">Semi</th>
                    <th class="center" style="width: 9%;">Final</th>
                  </tr>
                </thead>
                <tbody>
                  ${syllabus.gradingSystem.map(group => 
                    group.ilos.map((ilo, index) => 
                      '<tr>' +
                      (index === 0 ? '<td rowspan="' + group.ilos.length + '" class="center bold">' + group.co + '</td>' : '') +
                      '<td class="center bold">' + ilo.id + '</td>' +
                      '<td>' + (Array.isArray(ilo.assessments) ? ilo.assessments.join(', ') : ilo.assessments) + '</td>' +
                      '<td class="center">' + (ilo.weight?.prelim || '') + '</td>' +
                      '<td class="center">' + (ilo.weight?.midterm || '') + '</td>' +
                      '<td class="center">' + (ilo.weight?.semi || '') + '</td>' +
                      '<td class="center">' + (ilo.weight?.final || '') + '</td>' +
                      '<td class="center">' + ilo.minPassing + '</td>' +
                      '</tr>'
                    ).join('')
                  ).join('')}
                  <tr class="total-row">
                    <td colspan="3" class="center">TOTAL</td>
                    <td class="center">${calculateTotal('prelim')}%</td>
                    <td class="center">${calculateTotal('midterm')}%</td>
                    <td class="center">${calculateTotal('semi')}%</td>
                    <td class="center">${calculateTotal('final')}%</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="footer">
              <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p>Course Code: ${course.code} | ${course.name}</p>
            </div>
          </body>
          </html>
        `

        const printWindow = window.open('', '', 'width=1024,height=768')
        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        setTimeout(() => {
            printWindow.print()
        }, 500)
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
                            {selectedStatus === 'APPROVED' && <th width={100}>EXPORT</th>}
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
                                    {selectedStatus === 'APPROVED' && (
                                        <td width={100}>
                                            <button 
                                                onClick={() => generatePDF(row)}
                                                className={'actionLink'}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                Export <Download size={18} />
                                            </button>
                                        </td>
                                    )}
                                    <td className={styles.fill}>
                                        <Link className={'actionLink'} to={selectedStatus === 'APPROVED' ? `/role/instructor/courses/${row.code}?status=approved` : `/courses/${row.code}`}>
                                            {row.status === 'DRAFT' ? 'Compose' : 'View'}
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
                                            {isReturned ? (
                                                <Link className={'actionLink'} to={`/revisions/${row.code}`}>
                                                    Update
                                                    <Edit size={18} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'} to={`/role/instructor/courses/${row.code}`}>
                                                    View
                                                    <ChevronRight size={18} />
                                                </Link>
                                            )}
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