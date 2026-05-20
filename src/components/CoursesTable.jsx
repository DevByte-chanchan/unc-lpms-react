import {useState, useMemo} from 'react';
import React from 'react';
import {Link, useSearchParams} from 'react-router-dom'
import styles from '../styles/CoursesTable.module.sass';
import { ChevronRight, Edit, CheckCircle, Clock, XCircle, Download } from 'react-feather';
import { syllabiData } from '../data/syllabiData';
import { exportSyllabusToPDF } from '../utils/pdfExport';
import { getWorkflow } from '../utils/workflowHelpers';

const CoursesTable = ({}) => {

    const [searchParams, setSearchParams] = useSearchParams();
    const initialStatus = searchParams.get('status') || 'DRAFT';

    const currentYear = new Date().getFullYear();
    const startYear = 2000;
    const semOptions = ['1st Sem', '2nd Sem'];

    const yearOptions = [];
    for (let i = currentYear; i >= startYear; i--) {
        yearOptions.push(<option key={i} value={i}>{i}</option>);
    }

    const fmt = (iso) => {
        if (!iso) return ''
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    }

    const baseCourses = syllabiData.map(s => ({
        code: s.code,
        name: s.name,
        lastUpdated: s.update || 'TBA',
        program: 'Computer Science',
        docsUploaded: 3,
        docsTotal: 3,
    }));

    // Derive status from workflow
    const getDerivedStatus = (code) => {
        const wf = getWorkflow(code)
        const stage = wf.currentStage || 'submitted'
        if (stage === 'approved') return 'APPROVED'
        if (stage === 'returned') return 'RETURNED'
        if (stage === 'submitted') return 'DRAFT'
        return 'PENDING' // parallel_review, program_head, dean
    }

    const getSubmittedDate = (code) => {
        const wf = getWorkflow(code)
        return fmt(wf.submittedAt)
    }

    const getApprovedDate = (code) => {
        const wf = getWorkflow(code)
        return fmt(wf.dean?.completedAt)
    }

    const getReviewerStatuses = (code) => {
        const wf = getWorkflow(code)
        const stage = wf.currentStage || 'submitted'

        const stageOrder = ['submitted', 'parallel_review', 'program_head', 'dean', 'approved']
        const stageIndex = stageOrder.indexOf(stage)
        // For 'returned', only show statuses of reviewers who actually acted
        const effectiveIndex = stageIndex

        const reviewerStageMap = {
            library_director: 'parallel_review',
            industry_consultant: 'parallel_review',
            programHead: 'program_head',
            dean: 'dean',
        }

        const isReviewerReached = (reviewerKey) => {
            const revStageIndex = stageOrder.indexOf(reviewerStageMap[reviewerKey])
            return effectiveIndex >= revStageIndex
        }

        const checkStatus = (revStatus, reviewerKey) => {
            if (revStatus === 'done') return 'A'
            if (revStatus === 'returned') return 'R'
            if (revStatus === 'pending' && isReviewerReached(reviewerKey)) return 'P'
            return ''
        }

        const lib = checkStatus(wf.parallelReview?.library_director?.status, 'library_director')
        const ic = checkStatus(wf.parallelReview?.industry_consultant?.status, 'industry_consultant')
        const ph = checkStatus(wf.programHead?.status, 'programHead')
        const dean = checkStatus(wf.dean?.status, 'dean')

        return [lib, ic, ph, dean]
    }

    // Force re-render on interval
    const [tick, setTick] = useState(0)
    React.useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 2000)
        return () => clearInterval(interval)
    }, [])

    const Courses = useMemo(() => baseCourses.map(c => ({
        ...c,
        status: getDerivedStatus(c.code),
        submittedDate: getSubmittedDate(c.code),
        approved: getApprovedDate(c.code),
    })), [tick])

    const [selectedStatus, setSelectedStatus] = useState(initialStatus);
    const handleStatusChange = (e) => {
        const val = e.target.value;
        setSelectedStatus(val);
        setSearchParams({ status: val });
    }

    const getStatusBadge = (text, type) => {
        const styles_map = {
            approved: { color: '#047857', background: '#ecfdf5', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
            pending: { color: '#b45309', background: '#fffbeb', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
            draft: { color: '#6b7280', background: '#f3f4f6', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
            returned: { color: '#dc2626', background: '#fef2f2', padding: '3px 10px', borderRadius: 99, fontWeight: 600, fontSize: 12 },
        }
        return <span style={styles_map[type] || styles_map.draft}>{text}</span>
    }

    const getStatusText = (char) => {
        if (char === 'A') return getStatusBadge('Approved', 'approved')
        if (char === 'P') return getStatusBadge('Pending', 'pending')
        if (char === 'R') return getStatusBadge('Returned', 'returned')
        return <span style={{ color: '#d1d5db' }}>—</span>
    }

    const getDocumentStatusBadge = (uploaded, total) => {
        let color, background;
        if (uploaded === total) {
            color = '#047857';
            background = '#ecfdf5';
        } else if (uploaded > 0) {
            color = '#b45309';
            background = '#fffbeb';
        } else {
            color = '#dc2626';
            background = '#fef2f2';
        }
        return (
            <span style={{ 
                color, 
                background, 
                padding: '3px 10px', 
                borderRadius: 99, 
                fontWeight: 600, 
                fontSize: 12 
            }}>
                {uploaded}/{total}
            </span>
        );
    }

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
        const syllabus = syllabiData.find(s => s.code === course.code)
        if (syllabus) {
            exportSyllabusToPDF(syllabus, course.code)
        }
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
                    <select onChange={handleStatusChange} value={selectedStatus}>
                        <option value="DRAFT">Draft ({Courses.filter(r => r.status === 'DRAFT').length})</option>
                        <option value="PENDING">Pending ({Courses.filter(r => r.status === 'PENDING' || r.status === 'RETURNED').length})</option>
                        <option value="APPROVED">Approved ({Courses.filter(r => r.status === 'APPROVED').length})</option>
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
                            <th width={300}>COURSE NAME</th>
                            <th width={150}>PROGRAM</th>
                            <th width={150}>LAST UPDATED</th>
                            <th width={100}>STATUS</th>
                            {selectedStatus === 'APPROVED' && <th width={120}>EXPORT</th>}
                            <th className={styles.fill}></th>
                        </tr>
                        </thead>

                        <tbody>
                        {Courses
                            .filter(row => row.status === selectedStatus)
                            .map((row, index) => (
                                <tr key={index}>
                                    <td width={150}>{row.code}</td>
                                    <td width={300}>{row.name}</td>
                                    <td width={150}>{row.program}</td>
                                    <td width={150}>{row.lastUpdated}</td>
                                    <td width={140}>
                                        {selectedStatus === 'DRAFT' ? getStatusBadge('Draft', 'draft') : getStatusBadge('Approved', 'approved')}
                                    </td>
                                    {selectedStatus === 'APPROVED' && (
                                        <td width={120}>
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
                                        <Link className={'actionLink'} to={selectedStatus === 'APPROVED' ? `/role/instructor/courses/${encodeURIComponent(row.code)}?status=approved` : `/courses/${encodeURIComponent(row.code)}`}
                                            state={{ from: '/', fromStatus: selectedStatus }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {row.status === 'DRAFT' ? 'Compose' : 'View'}
                                            <ChevronRight size={18} />
                                        </Link>

                                    </td>
                                </tr>
                            ))}
                        {Courses.filter(row => row.status === selectedStatus).length === 0 && (
                            <tr><td colSpan={selectedStatus === 'APPROVED' ? 7 : 6} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>
                                {selectedStatus === 'DRAFT' ? 'No draft courses' : 'No approved courses yet'}
                            </td></tr>
                        )}
                        </tbody>
                    </table>
                }
                {selectedStatus === 'PENDING' &&
                    <table>
                        <thead>
                            <tr>
                                <th width={150}>CODE</th>
                                <th width={250}>COURSE NAME</th>
                                <th width={120}>PROGRAM</th>
                                <th width={140}>DATE SUBMITTED</th>
                                <th className={styles.status} width={650}>STATUS</th>
                                <th className={styles.fill}></th>
                            </tr>
                            <tr className={styles['sub-column']}>
                                <th width={150}></th>
                                <th width={250}></th>
                                <th width={120}></th>
                                <th width={140}></th>
                                <th style={{borderLeft: "5px solid white"}} className={styles.lighten} width={162.5}>Director of Libraries</th>
                                <th className={styles.lighten} width={162.5}>Industry Consultant</th>
                                <th className={styles.lighten} width={162.5}>Program Head</th>
                                <th style={{borderRight: "5px solid white"}} className={styles.lighten} width={162.5}>Dean</th>
                                <th className={styles.fill}></th>
                            </tr>
                        </thead>


                        <tbody>
                        {Courses
                            .filter(row => row.status === 'PENDING' || row.status === 'RETURNED')
                            .map((row, index) => {
                                const s = getReviewerStatuses(row.code)

                                return (
                                    <tr key={index}>
                                        <td width={150}>{row.code}</td>
                                        <td width={250}>{row.name}</td>
                                        <td width={120}>{row.program}</td>
                                        <td width={140}>{row.submittedDate}</td>

                                        {/* Library Director */}
                                        <td className={styles.lighten} width={162.5}>
                                            {getStatusText(s[0])}
                                        </td>

                                        {/* Industry Consultant */}
                                        <td className={styles.lighten} width={162.5}>
                                            {getStatusText(s[1])}
                                        </td>

                                        {/* Program Head */}
                                        <td className={styles.lighten} width={162.5}>
                                            {getStatusText(s[2])}
                                        </td>

                                        {/* Dean */}
                                        <td className={styles.lighten} width={162.5}>
                                            {getStatusText(s[3])}
                                        </td>

                                        {/* Action Column */}
                                        <td className={styles.fill}>
                                            {row.status === 'RETURNED' ? (
                                                <Link className={'actionLink'} to={`/revisions/${encodeURIComponent(row.code)}`} state={{ from: '/', fromStatus: selectedStatus }}>
                                                    Update
                                                    <ChevronRight size={18} />
                                                </Link>
                                            ) : (
                                                <Link className={'actionLink'} to={`/role/instructor/courses/${encodeURIComponent(row.code)}`} state={{ from: '/', fromStatus: selectedStatus }}>
                                                    View
                                                    <ChevronRight size={18} />
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        {Courses.filter(row => row.status === 'PENDING' || row.status === 'RETURNED').length === 0 && (
                            <tr><td colSpan={9} style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No pending courses</td></tr>
                        )}
                        </tbody>
                    </table>

                }

            </div>

        </div>
    );
};

export default CoursesTable;