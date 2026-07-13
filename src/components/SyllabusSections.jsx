
import styles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass';
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, Play, Send, Info, Download} from 'react-feather';
import React, {useEffect, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import SyllabusPreview from "./SyllabusPreview.jsx";
import PDFViewerModal from './PDFViewerModal.jsx';
import { buildSyllabusHtml } from "../utils/syllabusPdfHtml.js";
import {fetchJson} from "../utils/api";
import { getSyllabusByCode } from "../data/syllabiData.js";
import { getWorkflow } from "../utils/workflowHelpers.js";
import { getPreviousYearContent } from "../services/syllabusService.js";
import { seedDummyComments } from "../utils/seedDummyComments.js";
import unclogo from '../assets/unclogo.png';

const SyllabusSections = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';
    const { status: status } = useParams();
    // const status = "returned";

    if (import.meta.env.DEV) console.log('status:', status);

    // NEW: Loading State
    const [isLoading, setIsLoading] = useState(false);

    // NEW: Effect to trigger loading whenever selectedSection changes
    useEffect(() => {
        setIsLoading(true);
        // Simulate a network request or rendering delay
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500); // 0.5 seconds delay

        return () => clearTimeout(timer);
    }, [selectedSection]);

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value });
    };

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [showWorkflowPopup, setShowWorkflowPopup] = useState(false);
    const [workflowPopupPos, setWorkflowPopupPos] = useState(null);
    const workflowBtnRef = React.useRef(null);

    // ilo
    const params = useParams();
    const code = params.code || (new URLSearchParams(window.location.search)).get('code');

    const [iloData, setIloData] = useState({ course: null, courseOutcomes: [], ilos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // NEW Feature: State for tracking unresolved comment counts per type
    const [commentCounts, setCommentCounts] = useState({});

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchILOs() {
            setLoading(true);
            setError(null);
            try {
                // Automatically appends API_BASE, throws on HTTP error, and extracts json payload
                const data = await fetchJson('/api/ilos/' + encodeURIComponent(code));

                if (!mounted) return;
                const flatILOs = [];
                for (const co of data.courseOutcomes) {
                    co.ilos.sort((a, b) => a.id - b.id);
                    co.ilos.forEach(ilo => flatILOs.push({ ...ilo, co_id: co.co_id }));
                }
                setIloData({ course: data.course, courseOutcomes: data.courseOutcomes, ilos: flatILOs });
                seedDummyComments(code);
            } catch (err) {
                console.warn('API unavailable for ILOs, using static data');
                if (!mounted) return;
                const syllabus = getSyllabusByCode(code);
                if (syllabus && syllabus.ilos) {
                    const parsed = syllabus.ilos.map(ilo => ({
                        ...ilo,
                        co_id: ilo.id ? ilo.id.split('-')[0].replace('CO', '') : '',
                        description: ilo.intendedLearningOutcome || ilo.description || ''
                    }))
                    setIloData({ course: { code: syllabus.code, title: syllabus.name }, courseOutcomes: [], ilos: parsed });
                    seedDummyComments(code);
                } else {
                    setError(err.message);
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchILOs();
        return () => {
            mounted = false;
        };
    }, [code]);

    // NEW Feature: Fetch unresolved comment counts from localStorage
    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchCommentCounts() {
            try {
                const data = await fetchJson(`/api/comments/unresolved-counts/${encodeURIComponent(code)}`);

                if (!mounted) return;

                // Restructure array response to quick lookup map format: { "iloId_type": count }
                const countsMap = {};
                data.forEach(item => {
                    countsMap[`${item.ilo_id}_${item.comment_for}`] = parseInt(item.count, 10);
                });
                setCommentCounts(countsMap);
            } catch (err) {
                console.warn('API unavailable for comment counts, falling back to localStorage');
                try {
                    const raw = localStorage.getItem('approval_comments_v1');
                    if (raw && mounted) {
                        const allComments = JSON.parse(raw);
                        const countsMap = {};
                        allComments.forEach(c => {
                            if (c.status !== 'resolved') {
                                const typeKey = c.coverageType?.toLowerCase() || '';
                                const badgeKey = typeKey === 'topic' ? 'topics' : typeKey === 'tla' ? 'tlas' : typeKey;
                                const key = `${c.ilo}_${badgeKey}`;
                                countsMap[key] = (countsMap[key] || 0) + 1;
                            }
                        });
                        setCommentCounts(countsMap);
                    }
                } catch (e) {
                    console.error('Failed to read comment counts from localStorage', e);
                }
            }
        }

        fetchCommentCounts();
        return () => { mounted = false; };
    }, [code, status]);

    // Sprint 3: auto-population + PDF export states
    const [previousYearLoading, setPreviousYearLoading] = useState(false);
    const [pdfExportLoading, setPdfExportLoading] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    const handleLoadPreviousYear = async () => {
        if (!window.confirm('Load content from the previous academic year? Current data will be overwritten.')) return;
        setPreviousYearLoading(true);
        try {
            const { data } = await getPreviousYearContent(code);
            const prev = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            if (prev) {
                setCourseDetailsData(prev => ({ ...prev, name: prev.name || '', description: prev.description || '', credits: prev.credits || '', contact: prev.contact || '', prerequisites: prev.prerequisites || '', class: prev.class || '', cmo: prev.cmo || '', revision: prev.revision || 0, year: prev.year || '', sem: prev.sem || '' }));
                if (prev.ilos) {
                    const flatILOs = prev.ilos.map((ilo, idx) => ({ ...ilo, co_id: ilo.co_id || Math.floor(idx / 3) + 1, description: ilo.intendedLearningOutcome || ilo.description || '' }));
                    setIloData({ course: { code: prev.code, title: prev.name }, courseOutcomes: prev.courseOutcomes || [], ilos: flatILOs });
                }
                if (prev.ilos || prev.courseOutcomes) {
                    const cpaCourses = prev.ilos ? [...new Set(prev.ilos.map(i => i.courseOutcome))].map((co, idx) => ({ id: idx + 1, description: co })) : [];
                    setCpaData({ course: { code: prev.code, title: prev.name }, programOutcomes: prev.programOutcomes || [], courseOutcomes: prev.courseOutcomes || cpaCourses });
                }
                setCoverageData({ ilos: prev.ilos || [], topics: prev.topics || [], assessments: prev.assessments || [] });
                setCriteriaData({ gradingSystem: prev.gradingSystem || [] });
                setReferenceData(null);
                alert('Previous year content loaded successfully.');
            }
        } catch (err) {
            const msg = err.response?.data?.error || err.message || 'Failed to load previous year content';
            alert(msg);
        } finally {
            setPreviousYearLoading(false);
        }
    };

    const handleExportPdf = async () => {
        setPdfExportLoading(true);
        try {
            const syllabus = getSyllabusByCode(code)
            if (!syllabus) { alert('Syllabus data not found'); setPdfExportLoading(false); return }
            const workflow = getWorkflow(code)
            const logoUrl = new URL(unclogo, window.location.origin).href
            const html = buildSyllabusHtml(syllabus, code, workflow, logoUrl)
            const blob = new Blob([html], { type: 'text/html' })
            const url = URL.createObjectURL(blob)
            setPreviewFile({
                file_url: url,
                file_name: `Syllabus_${code}.html`,
                instructor_name: syllabus.instructor || '',
                course_id: code,
                course_name: syllabus.name || '',
                submission_date: null,
                period_label: '',
            })
        } catch (err) {
            alert('Export error: ' + (err?.message || err || 'unknown'))
        } finally {
            setPdfExportLoading(false);
        }
    };

    const closeExportModal = () => {
        if (previewFile?.file_url?.startsWith('blob:')) URL.revokeObjectURL(previewFile.file_url)
        setPreviewFile(null)
    }

    // course details state
    const [courseDetailsData, setCourseDetailsData] = useState({
        code: '', name: '', description: '', credits: '', contact: '',
        prerequisites: '', class: '', cmo: '', revision: 0, year: '', sem: ''
    });
    const [courseDetailsLoading, setCourseDetailsLoading] = useState(false);
    const [courseDetailsError, setCourseDetailsError] = useState(null);

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchCourseDetails() {
            setCourseDetailsLoading(true);
            setCourseDetailsError(null);
            try {
                const data = await fetchJson('/api/course-details/' + encodeURIComponent(code));

                if (!mounted) return;

                setCourseDetailsData({
                    code: data.code ?? '',
                    name: data.name ?? '',
                    description: data.description ?? '',
                    credits: data.credits ?? '',
                    contact: data.contact ?? '',
                    prerequisites: data.prerequisites ?? '',
                    class: data.class ?? '',
                    cmo: data.cmo ?? '',
                    revision: data.revision ?? 0,
                    year: data.year ?? '',
                    sem: data.sem ?? ''
                });
            } catch (err) {
                console.warn('API unavailable for course details, using static data');
                if (!mounted) return;
                const syllabus = getSyllabusByCode(code);
                if (syllabus) {
                    setCourseDetailsData({
                        code: syllabus.code || '', name: syllabus.name || '', description: syllabus.description || '',
                        credits: syllabus.credits || '', contact: syllabus.contact || '',
                        prerequisites: syllabus.prerequisites || '', class: syllabus.class || '',
                        cmo: syllabus.cmo || '', revision: syllabus.revision || 0,
                        year: syllabus.year || '', sem: syllabus.sem || ''
                    });
                } else {
                    setCourseDetailsError(err.message);
                }
            } finally {
                if (mounted) setCourseDetailsLoading(false);
            }
        }

        fetchCourseDetails();
        return () => { mounted = false; };
    }, [code]);

    // co po alignment state
    const [cpaData, setCpaData] = useState({
        course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: []
    });
    const [cpaLoading, setCpaLoading] = useState(false);
    const [cpaError, setCpaError] = useState(null);

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchCPA() {
            setCpaLoading(true);
            setCpaError(null);
            try {
                const data = await fetchJson('/api/course-outcome-alignment/' + encodeURIComponent(code));

                if (!mounted) return;

                setCpaData({
                    course: data.course ?? { code: '', title: '' },
                    programOutcomes: data.programOutcomes ?? [],
                    courseOutcomes: data.courseOutcomes ?? []
                });
            } catch (err) {
                console.warn('API unavailable for CPA, using static data');
                if (!mounted) return;
                const syllabus = getSyllabusByCode(code);
                if (syllabus) {
                    setCpaData({
                        course: { code: syllabus.code, title: syllabus.name },
                        programOutcomes: [],
                        courseOutcomes: syllabus.courseOutcomes || []
                    });
                } else {
                    setCpaError(err.message);
                }
            } finally {
                if (mounted) setCpaLoading(false);
            }
        }

        fetchCPA();
        return () => { mounted = false; };
    }, [code]);

    // criteria state
    const [criteriaData, setCriteriaData] = useState({ gradingSystem: [] });
    const [criteriaLoading, setCriteriaLoading] = useState(false);
    const [criteriaError, setCriteriaError] = useState(null);

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchCriteria() {
            setCriteriaLoading(true);
            setCriteriaError(null);
            try {
                const data = await fetchJson('/api/course-criteria/' + encodeURIComponent(code));

                if (!mounted) return;

                setCriteriaData({
                    gradingSystem: Array.isArray(data.gradingSystem) ? data.gradingSystem : []
                });
            } catch (err) {
                console.warn('API unavailable for criteria, using static data');
                if (!mounted) return;
                const syllabus = getSyllabusByCode(code);
                if (syllabus && syllabus.gradingSystem) {
                    setCriteriaData({ gradingSystem: syllabus.gradingSystem });
                } else {
                    setCriteriaError(err.message);
                    setCriteriaData({ gradingSystem: [] });
                }
            } finally {
                if (mounted) setCriteriaLoading(false);
            }
        }

        fetchCriteria();
        return () => { mounted = false; };
    }, [code]);

    // Helper method to safely isolate badge numbers
    const getBadgeCount = (iloId, type) => {
        return commentCounts[`${iloId}_${type}`] || 0;
    };

    // ==========================================
    // COURSE COVERAGE DATA LAYER (TOP-LEVEL HOOKS)
    // ==========================================
    const [coverageData, setCoverageData] = useState({ ilos: [], topics: [], assessments: [] });
    const [isMatrixLoading, setIsMatrixLoading] = useState(true);

    // FIXED: Standardized using your fetchJson util with mounted cleanups
    useEffect(() => {
        if (!code || selectedSection !== 'Course Coverage') return;
        let mounted = true;

        async function fetchLiveCoverageMatrix() {
            try {
                setIsMatrixLoading(true);

                // Using the consistent fetchJson helper utility wrapper
                const data = await fetchJson(`/api/course-coverage/${encodeURIComponent(code)}`);

                if (!mounted) return;
                setCoverageData(data);
            } catch (err) {
                console.warn('API unavailable for coverage, using static data');
                if (!mounted) return;
                const syllabus = getSyllabusByCode(code);
                if (syllabus) {
                    setCoverageData({ ilos: syllabus.ilos || [], topics: syllabus.topics || [], assessments: syllabus.assessments || [] });
                }
            } finally {
                if (mounted) setIsMatrixLoading(false);
            }
        }

        fetchLiveCoverageMatrix();

        return () => {
            mounted = false;
        };
    }, [code, selectedSection]);


    //References summary
    // 1. Manage view toggle state
    const [viewType, setViewType] = useState('Textbook');
// =========================================================================
    // REFERENCE SUMMARY DATA LAYER (Add this state and hook)
    // =========================================================================
    const [referenceData, setReferenceData] = useState(null);
    const [isReferencesLoading, setIsReferencesLoading] = useState(false);

    // This effect fires ONLY when switching to the 'References Summary' tab
    useEffect(() => {
        if (!code || selectedSection !== 'References Summary') return;
        let mounted = true;

        async function fetchReferenceSummaryData() {
            try {
                setIsReferencesLoading(true);

                // Hits your working backend references route using your custom fetchJson helper
                const data = await fetchJson(`/api/courses/${encodeURIComponent(code)}/references`);

                if (!mounted) return;
                setReferenceData(data); // Stores the beautiful JSON response you see in your browser!
            } catch (err) {
                console.warn('API unavailable for references, using static data');
                if (!mounted) return;
                const syllabus = getSyllabusByCode(code);
                if (syllabus && syllabus.references) {
                    const grouped = {};
                    syllabus.references.forEach(ref => {
                        const type = ref.type || 'Other';
                        if (!grouped[type]) grouped[type] = [];
                        grouped[type].push(ref);
                    });
                    setReferenceData(grouped);
                }
            } finally {
                if (mounted) setIsReferencesLoading(false);
            }
        }

        fetchReferenceSummaryData();

        return () => {
            mounted = false;
        };
    }, [code, selectedSection]);

    // =========================================================================
    // UPDATE THIS LINE: Point it to your new referenceData state variable
    // =========================================================================
    const referenceSummaryPayload = referenceData || {};

    const getData = (type) => {
        if (!referenceSummaryPayload) return [];

        // Strategy A: Direct Match (e.g., payload.Textbook)
        if (Array.isArray(referenceSummaryPayload[type])) {
            return referenceSummaryPayload[type];
        }

        // Strategy B: Axios Wrapper Match Fallback
        if (referenceSummaryPayload.data && Array.isArray(referenceSummaryPayload.data[type])) {
            return referenceSummaryPayload.data[type];
        }

        // Strategy C: Fallback Filter Array Tracker (e.g., payload.references)
        const fallbackArray = referenceSummaryPayload.references || referenceSummaryPayload.data?.references;
        if (Array.isArray(fallbackArray)) {
            return fallbackArray.filter(ref => ref.type?.toLowerCase() === type.toLowerCase());
        }

        return [];
    };

    const colWidths = {
        id: '70px',
        title: '300px',
        author: '200px',
        link: '200px',
        year: '100px'
    };

    return (
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link  to={`/${params.status ? `?status=${params.status}` : ''}`} className={'actionLink'} >
                    <div className={styles.return}>
                        <ChevronLeft size={22}/>
                    </div>
                </Link>


                <div className={styles['section-select']}>
                    <select value={selectedSection} onChange={handleSectionChange}>
                        <option value="Course Details">Course Details</option>
                        <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                        {(status === 'approved' || status === 'pending' || status === 'draft' || status === 'returned') &&
                            <option value="Course Coverage">Course Coverage</option>
                        }
                        {(status === 'approved' || status === 'pending') &&
                            <option value="References Summary">References</option>
                        }
                        {(status === 'draft' || status === 'returned') &&
                            <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                        }
                        <option value="Criteria for Grading">Criteria for Grading</option>
                    </select>
                </div>


                {(status === 'draft' || status === 'returned') &&
                    <>
                        <div onClick={handleLoadPreviousYear} className={styles.draft} style={{ cursor: previousYearLoading ? 'wait' : 'pointer', opacity: previousYearLoading ? 0.6 : 1 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            {previousYearLoading ? 'Loading...' : 'Load Previous Year'}
                        </div>
                        <div onClick={() => setIsPreviewOpen(true)} className={styles.draft}>
                            <Play size={14} />
                            Preview
                        </div>

                        <div  className={styles.submit}>
                            <Send size={14}/>
                            Submit
                        </div></>
                }

                {status !== 'draft' && <div ref={workflowBtnRef} className={styles.more} onClick={() => { const r = workflowBtnRef.current?.getBoundingClientRect(); const popupH = 280; if (r) setWorkflowPopupPos({ right: window.innerWidth - r.right, top: r.bottom + 4 + popupH > window.innerHeight ? r.top - popupH - 4 : r.bottom + 4 }); setShowWorkflowPopup(true); }}>
                    <Info strokeWidth={2} size={16}/>
                </div>}

                <div onClick={handleExportPdf} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 16px', border: 'none', borderRadius: 5, fontSize: 14, fontWeight: 500, height: 40, cursor: pdfExportLoading ? 'wait' : 'pointer', background: pdfExportLoading ? '#94a3b8' : '#19282C', color: 'white', fontFamily: "'Poppins', sans-serif", transition: 'transform 0.3s ease' }}
                    onMouseEnter={e => { if (!pdfExportLoading) e.currentTarget.style.transform = 'scale(1.04)' }}
                    onMouseLeave={e => { if (!pdfExportLoading) e.currentTarget.style.transform = 'scale(1)' }}>
                    <Download size={14} />
                    {pdfExportLoading ? 'Exporting...' : 'Export'}
                </div>


            </div>

            <div className={styles['dynamic-sections']}>

                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : (
                    <>

                        {selectedSection === 'Course Details' &&
                            <section>
                                <div className={stylesB.courseDetailsContainer}>
                                    <table className={stylesB.documentTable}>
                                        <tbody>
                                        <tr>
                                            <th className={stylesB.labelCell}>Course No.</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.code || ''}</td>
                                            <th className={stylesB.descHeader}>Course Description</th>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Course Title</th>
                                            <td className={stylesB.valueCell}><strong>{courseDetailsData?.name || ''}</strong></td>
                                            <td rowSpan="9" className={stylesB.descCell}>
                                                <div className={stylesB.descContent}>
                                                    {courseDetailsData?.description || ''}
                                                </div>
                                            </td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Credit</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.credits || ''}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Contact Hours/Week</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.contact || ''}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Pre-requisites</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.prerequisites || ''}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Classification/Field</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.class || ''}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>CMO</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.cmo || ''}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Learning Plan Revision No.</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.revision ?? 0}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Year Level</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.year || ''}</td>
                                        </tr>

                                        <tr>
                                            <th className={stylesB.labelCell}>Term</th>
                                            <td className={stylesB.valueCell}>{courseDetailsData?.sem || ''}</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        }



                        {selectedSection === 'Course and Program Outcome Alignment' &&
                            <section>
                                <div className={stylesB['cpa-container']} >
                                    <div className={stylesB.legend}>
                                        <span className={stylesB.legendTitle}>Legend:</span>
                                        <div className={stylesB.legendItems}>
                                            <span><strong>I</strong> – Introductory</span>
                                            <span><strong>E</strong> – Enabling</span>
                                            <span><strong>D</strong> – Demonstrative</span>
                                        </div>
                                    </div>

                                    <div  style={{border:"none"}} className={stylesB.tableScrollWrapper} >
                                        <table className={stylesB.alignmentTable}>
                                            <thead>
                                            <tr>
                                                <th className={stylesB.firstColHeader}>
                                                    After completion of the course, the student should be able to:
                                                </th>

                                                {/* Render dynamic PO headers from cpaData.programOutcomes */}
                                                {cpaData.programOutcomes && cpaData.programOutcomes.length > 0
                                                    ? cpaData.programOutcomes.map(po => (
                                                        <th key={po.key} className={stylesB.poHeader}>{po.key}</th>
                                                    ))
                                                    : // fallback to PO1..PO13 if none returned
                                                    ['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12','PO13'].map(po => (
                                                        <th key={po} className={stylesB.poHeader}>{po}</th>
                                                    ))
                                                }
                                            </tr>
                                            </thead>

                                            <tbody>
                                            {cpaData.courseOutcomes && cpaData.courseOutcomes.length > 0 ? (
                                                cpaData.courseOutcomes.map(co => (
                                                    <tr key={co.id}>
                                                        <td className={stylesB.descCell}>
                                                            {co.description}
                                                        </td>

                                                        {/* Render mapping cells; ensure we render as many columns as programOutcomes length */}
                                                        {(cpaData.programOutcomes.length > 0 ? cpaData.programOutcomes : Array(13).fill(null)).map((po, idx) => (
                                                            <td key={idx} className={stylesB.mappingCell}>
                                                                {co.poMappings && co.poMappings[idx] ? co.poMappings[idx] : ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className={styles.emptyRow}>
                                                    <td colSpan={(cpaData.programOutcomes.length || 13) + 1}>
                                                        <div className={styles.emptyStateContainer}>
                                                            <Inbox size={40} strokeWidth={1} />
                                                            <span>No course outcomes / alignments found for this course.</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        }


                        {selectedSection === 'Intended Learning Outcomes' && (
                            <section>
                                <div className={styles['ilo-container']}>
                                    <table>
                                        <thead>
                                        <tr>
                                            <th width={150}>CO-ILO #</th>
                                            <th width={600}>Description</th>
                                            <th className={styles.fill} width={250}></th>

                                        </tr>
                                        </thead>
                                        <tbody>
                                        {iloData.ilos && iloData.ilos.length > 0 ? (
                                            iloData.ilos.map((ilo, index) => {
                                                const coNumber = ilo.co_id;
                                                const iloNumber = (index % 3) + 1;
                                                const entryLabel = `CO${coNumber}-ILO${iloNumber}`;

                                                // Evaluate counts safely
                                                const refBadges = getBadgeCount(ilo.id, 'references');
                                                const topicBadges = getBadgeCount(ilo.id, 'topics');
                                                const tlaBadges = getBadgeCount(ilo.id, 'tlas');

                                                return (
                                                    <tr key={ilo.id}>
                                                        <td width={150} style={{ fontWeight: 500 }}>{entryLabel}</td>
                                                        <td  width={600}>{ilo.description}</td>
                                                        <td className={styles.fill} width={250}
                                                            style={{
                                                                display: "flex", flexDirection: "column",
                                                                alignItems: "end", gap: 4, padding: '6px 14px',
                                                            }}>

                                                            {/* Assign References */}
                                                            <Link className={'actionLink'} to={`/references/form/${code}/${ilo.id}/${status}`}>
                        <span className={styles['link-text-wrapper']}>
                            Assign References
                                                                <ChevronRight size={16} />
                            <div className={styles.fixedWidth}>
                                {refBadges > 0 && (
                                    <span className={styles['comment-badge']}>{refBadges}</span>
                                )}
                            </div>
                        </span>
                                                            </Link>

                                                            {/* Assign Topics */}
                                                            <Link className={'actionLink'} to={`/topics/form/${code}/${ilo.id}/${status}`}>
                        <span className={styles['link-text-wrapper']}>
                            Assign Topics
                                                                <ChevronRight size={16} />

                            <div className={styles.fixedWidth}>
                                {topicBadges > 0 && (
                                    <span className={styles['comment-badge']}>{topicBadges}</span>
                                )}
                            </div>
                        </span>
                                                            </Link>

                                                            {/* Assign TLAs */}
                                                            <Link className={'actionLink'} to={`/tlas/form/${code}/${ilo.id}/${status}`}>
                        <span className={styles['link-text-wrapper']}>
                            Assign TLAs
                                                                <ChevronRight size={16} />
                            <div className={styles.fixedWidth}>
                                {/* FIXED: Now accurately checks tlaBadges instead of refBadges */}
                                {tlaBadges > 0 && (
                                    <span className={styles['comment-badge']}>{tlaBadges}</span>
                                )}
                            </div>
                        </span>
                                                            </Link>

                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr className={styles.emptyRow}>
                                                <td colSpan={3}>
                                                    <div className={styles.emptyStateContainer}>
                                                        <Inbox size={40} strokeWidth={1} />
                                                        <span>No ILOs found.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}




                        {selectedSection === 'Criteria for Grading' && (() => {
                            // --- 1. RETRIEVE DATA ---
                            const gradingSystem = criteriaData.gradingSystem || [];

                            // --- 2. HELPER: Calculate Totals ---
                            const calculateTotal = (period) => {
                                let total = 0;
                                gradingSystem.forEach(group => {
                                    if (group.ilos) {
                                        group.ilos.forEach(ilo => {
                                            total += Number(ilo.weight?.[period] || 0);
                                        });
                                    }
                                });
                                return total;
                            };

                            // --- 3. RENDER THE PREVIEW TABLE ---
                            return (
                                <div className={stylesB.criteriaContainer}>
                                    <div  className={stylesB.tableScrollWrapper}>
                                        <table className={stylesB.criteriaTable}>
                                            <thead>
                                            <tr>
                                                <th rowSpan="2" className={stylesB.headerCell} style={{ width: '100px' }}>COURSE OUTCOME</th>
                                                {/* Adjusted width since description is gone */}
                                                <th rowSpan="2" className={stylesB.headerCell} style={{ width: '80px' }}>ILO #</th>
                                                <th rowSpan="2" className={stylesB.headerCell}>ASSESSMENTS</th>
                                                <th colSpan="4" className={stylesB.headerCell}>WEIGHT %</th>
                                                <th rowSpan="2" className={stylesB.headerCell}>MIN PASSING %</th>
                                            </tr>
                                            <tr className={stylesB.subHeaderRow}>
                                                <th className={stylesB.subHeader}>Prelim</th>
                                                <th className={stylesB.subHeader}>Midterm</th>
                                                <th className={stylesB.subHeader}>Semi</th>
                                                <th className={stylesB.subHeader}>Final</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {criteriaLoading ? (
                                                <tr>
                                                    <td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>Loading...</td>
                                                </tr>
                                            ) : criteriaError ? (
                                                <tr>
                                                    <td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>{criteriaError}</td>
                                                </tr>
                                            ) : gradingSystem.length > 0 ? (
                                                gradingSystem.map((group) => (
                                                    <React.Fragment key={group.co}>
                                                        {group.ilos.map((ilo, index) => (
                                                            // Generate a unique key by combining CO and ILO since "ILO1" is now repeated
                                                            <tr key={`${group.co}-${ilo.id}`}>

                                                                {/* COURSE OUTCOME CELL (Spans all ILOs) */}
                                                                {index === 0 && (
                                                                    <td rowSpan={group.ilos.length} className={styles.coCell}>
                                                                        <strong>{group.co}</strong>
                                                                    </td>
                                                                )}

                                                                {/* ILO Cell - Display ONLY the ID (e.g., ILO1) centered */}
                                                                <td className={styles.dataCellCenter}>
                                                                    <span style={{ fontWeight: '500' }}>{ilo.id}</span>
                                                                </td>

                                                                {/* Assessments */}
                                                                <td className={styles.dataCellCenter}>
                                                                    {Array.isArray(ilo.assessments)
                                                                        ? ilo.assessments.join(', ')
                                                                        : ilo.assessments}
                                                                </td>

                                                                {/* Weights */}
                                                                <td className={stylesB.dataCellCenter}>{ilo.weight?.prelim || ''}</td>
                                                                <td className={stylesB.dataCellCenter}>{ilo.weight?.midterm || ''}</td>
                                                                <td className={stylesB.dataCellCenter}>{ilo.weight?.semi || ''}</td>
                                                                <td className={stylesB.dataCellCenter}>{ilo.weight?.final || ''}</td>

                                                                {/* Min Passing */}
                                                                <td className={stylesB.dataCellCenter}>{ilo.minPassing}</td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>
                                                        No grading criteria available.
                                                    </td>
                                                </tr>
                                            )}

                                            {/* Total Row */}
                                            <tr className={stylesB.totalRow}>
                                                <td colSpan="3" className={stylesB.totalLabel}>TOTAL</td>
                                                <td className={stylesB.dataCellCenter}>{calculateTotal('prelim')}%</td>
                                                <td className={stylesB.dataCellCenter}>{calculateTotal('midterm')}%</td>
                                                <td className={stylesB.dataCellCenter}>{calculateTotal('semi')}%</td>
                                                <td className={stylesB.dataCellCenter}>{calculateTotal('final')}%</td>
                                                <td></td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {selectedSection === 'Course Coverage' && (() => {
                            // HOOK REMOVAL FIX: Only pure display/mapping structures live inside this execution block now
                            if (isMatrixLoading) {
                                return (
                                    <div className={stylesB.ccContainer}>
                                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                                            Loading Course Coverage Data Matrix...
                                        </div>
                                    </div>
                                );
                            }

                            const ilos = coverageData.ilos || [];
                            const allTopics = coverageData.topics || [];
                            const allAssessments = coverageData.assessments || [];

                            // Columns Configuration (Fixed Widths) matching old specifications
                            const colWidths = {
                                co: '45px',
                                ilo: '170px',
                                topic: '195px',
                                period: '90px',
                                tla: '300px',
                                assess: '220px',
                                ref: '110px'
                            };

                            // Helper: Find topics used in an ILO
                            const getILOTopics = (ilo) => {
                                return ilo.topics.map(topicTitle =>
                                    allTopics.find(t => t.title === topicTitle)
                                ).filter(Boolean);
                            };

                            // Helper: Collect TLAs from a list of Topics, filtered by phase
                            const getTLAsByPhase = (topics, phase) => {
                                let tlas = [];
                                topics.forEach(topic => {
                                    if (topic.tlas) {
                                        const filtered = topic.tlas.filter(t => t.classPhase && t.classPhase.toLowerCase() === phase.toLowerCase());
                                        tlas = [...tlas, ...filtered];
                                    }
                                });
                                return tlas;
                            };

                            // Helper: Find Assessments for a list of TLAs matched by tlaName
                            const getAssessmentsForTLAs = (tlas) => {
                                return tlas.flatMap(tla =>
                                    allAssessments.filter(a => a.tlaName === tla.tlaName)
                                );
                            };

                            const getRefId = (refString) => refString.split(' - ')[0];

                            // Helper Component for Rendering a TLA Group
                            const TlaGroup = ({ title, tlas }) => {
                                if (!tlas || tlas.length === 0) return null;
                                return (
                                    <div className={stylesB.tlaGroupBlock}>
                                        <div className={stylesB.tlaPhaseHeader}>{title}</div>
                                        {tlas.map(tla => (
                                            <div key={tla.id} className={stylesB.tlaItem}>
                                                <div className={stylesB.tlaNameLine}>
                            <span className={stylesB.perfTag}>
                                {tla.performedBy === 'Instructor' ? '[I]' : '[S]'}
                            </span>
                                                    <span className={stylesB.boldText}> {tla.tlaName}</span>
                                                    {tla.laboratory && <span className={stylesB.labTag}> (Lab)</span>}
                                                </div>
                                                <div className={stylesB.descText}>{tla.tlaDescription}</div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            };

                            return (
                                <div className={stylesB.ccContainer}>
                                    <div className={stylesB.ccScrollWrapper}>
                                        <table className={stylesB.ccTable}>
                                            <thead>
                                            <tr>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.co }}>CO</th>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.ilo }}>ILO</th>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.topic }}>TOPIC</th>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.period }}>PERIOD</th>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.assess }}>ASSESSMENT</th>
                                                <th className={stylesB.ccHeader} style={{ width: colWidths.ref, overflowWrap: 'break-word', wordBreak: 'break-all' }}>RESOURCES</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {ilos.length > 0 ? ilos.map((ilo, index) => {
                                                const rowTopics = getILOTopics(ilo);

                                                // Group TLAs
                                                const preTLAs = getTLAsByPhase(rowTopics, 'Pre-class');
                                                const inTLAs = getTLAsByPhase(rowTopics, 'In-class');
                                                const postTLAs = getTLAsByPhase(rowTopics, 'Post-class');

                                                // Collect and safely filter duplicates for row Assessments
                                                const allRowTLAs = [...preTLAs, ...inTLAs, ...postTLAs];
                                                const rawAssessments = getAssessmentsForTLAs(allRowTLAs);

                                                // Deduplicate row assessments based on Unique ID or name values to prevent UI clustering
                                                const uniqueAssessments = [];
                                                const seenAssessKeys = new Set();

                                                rawAssessments.forEach(assess => {
                                                    const key = `${assess.id}-${assess.assessmentName}`.toLowerCase();
                                                    if (!seenAssessKeys.has(key)) {
                                                        seenAssessKeys.add(key);
                                                        uniqueAssessments.push(assess);
                                                    }
                                                });

                                                // CLEAN ILO ID: "CO1-ILO1" -> "ILO1"
                                                const cleanILOId = ilo.id.includes('-') ? ilo.id.split('-')[1] : ilo.id;
                                                const currentCoPrefix = ilo.id.split('-')[0];

                                                // DYNAMIC ROWSPAN CALCULATION (consecutive-run safe: no overlap when COs aren't contiguous)
                                                const prevCoPrefix = index > 0 ? ilos[index - 1].id.split('-')[0] : null;
                                                const isFirstOfCO = currentCoPrefix !== prevCoPrefix;
                                                let coRowCount = 1;
                                                if (isFirstOfCO) {
                                                    for (let j = index + 1; j < ilos.length && ilos[j].id.split('-')[0] === currentCoPrefix; j++) {
                                                        coRowCount++;
                                                    }
                                                }

                                                return (
                                                    <tr key={ilo.id}>
                                                        {/* CO COLUMN */}
                                                        {isFirstOfCO && (
                                                            <td
                                                                rowSpan={coRowCount}
                                                                className={`${stylesB.ccCell} ${stylesB.centerText} ${stylesB.boldText}`}
                                                                style={{ width: colWidths.co }}
                                                            >
                                                                {currentCoPrefix}
                                                            </td>
                                                        )}

                                                        {/* ILO COLUMN */}
                                                        <td className={stylesB.ccCell} style={{ width: colWidths.ilo }}>
                                                            <div className={stylesB.boldText} style={{ marginBottom: '5px' }}>
                                                                {cleanILOId}
                                                            </div>
                                                            {ilo.intendedLearningOutcome}
                                                        </td>

                                                        {/* TOPIC COLUMN */}
                                                        <td className={stylesB.ccCell} style={{ width: colWidths.topic }}>
                                                            {rowTopics.map(t => (
                                                                <div key={t.id} className={stylesB.topicBlock}>
                                                                    <div className={stylesB.topicTitle}>{t.title}</div>
                                                                    <ul className={stylesB.subtopicList}>
                                                                        {t.subtopics && t.subtopics.map(sub => (
                                                                            <li key={sub.id}>{sub.value}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ))}
                                                        </td>

                                                        {/* PERIOD COLUMN */}
                                                        <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.period }}>
                                                            <div className={stylesB.boldText}>{ilo.deliveryWeek}</div>
                                                            <div>{ilo.allocatedTime}</div>
                                                        </td>

                                                        {/* MERGED TLA COLUMN */}
                                                        <td className={stylesB.ccCell} style={{ width: colWidths.tla }}>
                                                            <TlaGroup title="PRE-CLASS" tlas={preTLAs} />
                                                            <TlaGroup title="IN-CLASS" tlas={inTLAs} />
                                                            <TlaGroup title="POST-CLASS" tlas={postTLAs} />

                                                            {/* Fallback if empty */}
                                                            {allRowTLAs.length === 0 && <span className={stylesB.descText}>No activities listed.</span>}
                                                        </td>

                                                        {/* ASSESSMENT COLUMN (Assessment Method on top, Description below) */}
                                                        <td className={stylesB.ccCell} style={{ width: colWidths.assess }}>
                                                            {uniqueAssessments.map((assess, i) => (
                                                                <div key={i} className={stylesB.assessItem}>
                                                                    {/* Renders Assessment Method Header (e.g., "Quiz 1", "Oral Recitation") */}
                                                                    <div className={stylesB.boldText}>{assess.assessmentMethod}</div>

                                                                    {/* Renders Description / Criteria subtext below it if available */}
                                                                    {assess.description && (
                                                                        <div className={stylesB.descText}>{assess.description}</div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {uniqueAssessments.length === 0 && <span className={stylesB.descText}>No assessments listed.</span>}
                                                        </td>

                                                        {/* RESOURCES COLUMN */}
                                                        <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.ref }}>
                                                            {ilo.references.map((ref, i) => (
                                                                <div key={i}>{getRefId(ref)}</div>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No coverage data available.</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {selectedSection === 'References Summary' && (
                            <div className={stylesB.refContainer}>

                                {/* 1. SELECTION BAR */}
                                <div className={stylesB.refHeaderBar}>
                                    <select
                                        value={viewType}
                                        onChange={(e) => setViewType(e.target.value)}
                                        className={stylesB.refSelect}
                                    >
                                        <option value="">ALL</option>
                                        <option value="Textbook">TEXTBOOKS</option>
                                        <option value="Open Educational Resources">OPEN EDUCATIONAL RESOURCES</option>
                                        <option value="Online Resources">ONLINE RESOURCES</option>
                                    </select>
                                    <div className={stylesB.refArrow}>▼</div>
                                </div>

                                {/* 2. SCROLL WRAPPER */}
                                <div className={stylesB.refScrollWrapper}>
                                    {viewType === '' ? (
                                        /* --- ALL: one combined table --- */
                                        <table className={stylesB.refTable}>
                                            <thead>
                                            <tr>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {(() => {
                                                const all = [
                                                    ...getData('Textbook').map(r => ({ ...r, _type: 'TB' })),
                                                    ...getData('Open Educational Resources').map(r => ({ ...r, _type: 'OE' })),
                                                    ...getData('Online Resources').map(r => ({ ...r, _type: 'OR' })),
                                                ];
                                                return all.length > 0 ? all.map((ref, i) => (
                                                    <tr key={ref.id || i}>
                                                        <td className={stylesB.refDataCellCenter} style={{ width: colWidths.id }}>{ref._type}{i + 1}</td>
                                                        <td className={stylesB.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                        <td className={stylesB.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                        <td className={stylesB.refDataCellLeft} style={{ width: colWidths.link }}>
                                                             {ref._type === 'TB' ? (ref.isbn || '-') : (ref.link && ref.link !== '#' ? <a href={ref.link} target="_blank" rel="noreferrer" className={stylesB.refUrlLink}>{ref.link}</a> : '-')}
                                                        </td>
                                                        <td className={stylesB.refDataCellCenter} style={{ width: colWidths.year }}>
                                                            {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={5} className={stylesB.refEmpty}>No references found.</td></tr>
                                                );
                                            })()}
                                            </tbody>
                                        </table>
                                    ) : viewType === 'Textbook' ? (
                                        /* --- TEXTBOOKS --- */
                                        <table className={stylesB.refTable}>
                                            <thead>
                                            <tr>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.link }}>ISBN</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {getData('Textbook').length > 0 ? getData('Textbook').map((ref, i) => (
                                                <tr key={ref.id || i}>
                                                    <td className={stylesB.refDataCellCenter} style={{ width: colWidths.id }}>TB{i + 1}</td>
                                                    <td className={stylesB.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                    <td className={stylesB.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                    <td className={stylesB.refDataCellLeft} style={{ width: colWidths.link }}>{ref.isbn || '-'}</td>
                                                    <td className={stylesB.refDataCellCenter} style={{ width: colWidths.year }}>
                                                        {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={5} className={stylesB.refEmpty}>No Textbooks found.</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    ) : viewType === 'Open Educational Resources' ? (
                                        /* --- OER --- */
                                        <table className={stylesB.refTable}>
                                            <thead>
                                            <tr>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                                                <th className={stylesB.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {getData('Open Educational Resources').length > 0 ? getData('Open Educational Resources').map((ref, i) => (
                                                <tr key={ref.id || i}>
                                                    <td className={stylesB.refDataCellCenter} style={{ width: colWidths.id }}>OE{i + 1}</td>
                                                    <td className={stylesB.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                    <td className={stylesB.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                    <td className={stylesB.refDataCellLeft} style={{ width: colWidths.link }}>
                                                         {ref.link && ref.link !== '#' ? (
                                                             <a href={ref.link} target="_blank" rel="noreferrer" className={stylesB.refUrlLink}>{ref.link}</a>
                                                         ) : '-'}
                                                     </td>
                                                     <td className={stylesB.refDataCellCenter} style={{ width: colWidths.year }}>
                                                         {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                     </td>
                                                 </tr>
                                             )) : (
                                                 <tr><td colSpan={5} className={stylesB.refEmpty}>No OER found.</td></tr>
                                             )}
                                             </tbody>
                                         </table>
                                     ) : (
                                         /* --- ONLINE RESOURCES --- */
                                         <table className={stylesB.refTable}>
                                             <thead>
                                             <tr>
                                                 <th className={stylesB.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                 <th className={stylesB.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                 <th className={stylesB.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                 <th className={stylesB.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                                                 <th className={stylesB.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                             </tr>
                                             </thead>
                                             <tbody>
                                             {getData('Online Resources').length > 0 ? getData('Online Resources').map((ref, i) => (
                                                 <tr key={ref.id || i}>
                                                     <td className={stylesB.refDataCellCenter} style={{ width: colWidths.id }}>OR{i + 1}</td>
                                                     <td className={stylesB.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                     <td className={stylesB.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                     <td className={stylesB.refDataCellLeft} style={{ width: colWidths.link }}>
                                                         {ref.link && ref.link !== '#' ? (
                                                             <a href={ref.link} target="_blank" rel="noreferrer" className={stylesB.refUrlLink}>{ref.link}</a>
                                                        ) : '-'}
                                                    </td>
                                                    <td className={stylesB.refDataCellCenter} style={{ width: colWidths.year }}>
                                                        {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={5} className={stylesB.refEmpty}>No Online Resources found.</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        )}





                        <SyllabusPreview
                            isOpen={isPreviewOpen}
                            onClose={() => setIsPreviewOpen(false)}
                        />
                    </>
                )}

                    {/* ── WORKFLOW POPUP ─────────────────────────────────── */}
                    {showWorkflowPopup && (() => {
                        const wf = getWorkflow(code || '')
                        const submittedAt = wf.submittedAt || null
                        const approvers = [
                            { key: 'Industry Consultant', data: wf.parallelReview?.industry_consultant },
                            { key: 'Director of Libraries', data: wf.parallelReview?.library_director },
                            { key: 'Program Head', data: wf.programHead },
                            { key: 'Dean', data: wf.dean },
                        ]
                        return (
                            <>
                                <div onClick={() => setShowWorkflowPopup(false)} style={{ position: 'fixed', inset: 0, zIndex: 1199 }} />
                                <div style={{ position: 'fixed', right: workflowPopupPos?.right ?? 20, top: workflowPopupPos?.top ?? 80, width: 340, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 6px 18px rgba(0,0,0,0.12)', zIndex: 1200, padding: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <strong>View details</strong>
                                        <button onClick={() => setShowWorkflowPopup(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                        </button>
                                    </div>
                                    <div style={{ fontSize: 13, marginBottom: 10 }}>
                                        <div style={{ color: '#666', marginBottom: 8 }}>
                                            <strong>Submitted at:</strong> {submittedAt ? new Date(submittedAt).toLocaleString() : '-'}
                                        </div>
                                        {approvers.map((a, idx) => {
                                            const status = a.data?.status || 'pending'
                                            return (
                                                <div key={idx} style={{ marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #f0f0f0' }}>
                                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{a.key}</div>
                                                    {status === 'done' && a.data?.completedAt ? <div style={{ fontSize: 13, color: '#333' }}><strong>Approved at:</strong> {new Date(a.data.completedAt).toLocaleString()}</div> : null}
                                                    {status === 'returned' && a.data?.completedAt ? <div style={{ fontSize: 13, color: '#dc2626' }}><strong>Returned at:</strong> {new Date(a.data.completedAt).toLocaleString()}</div> : null}
                                                    {status === 'pending' ? <div style={{ fontSize: 13, color: '#999' }}>Pending</div> : null}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        )
                    })()}

                    {previewFile && (
                        <PDFViewerModal file={previewFile} onClose={closeExportModal} />
                    )}

            </div>
        </div>
    )
}

export default SyllabusSections;