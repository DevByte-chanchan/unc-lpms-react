
import styles from '../styles/SyllabusSections.module.sass'
import stylesB from '../styles/SyllabusPreview.module.sass'; // Ensure this has the new modal CSS classes
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, Play, Send, Info} from 'react-feather';
import React, {useEffect, useState} from "react";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import {getSyllabusByCode} from "../data/syllabiData.js";
import SyllabusPreview from "./SyllabusPreview.jsx";

const syllabusSections = ({status}) => {

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';

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
        setSearchParams({section: e.target.value})

    }


    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    //ilo
    const params = useParams();
    const code = params.code || (new URLSearchParams(window.location.search)).get('code');

    const [iloData, setIloData] = useState({course: null, courseOutcomes: []});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchILOs() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('http://localhost:5000/api/ilos/' + encodeURIComponent(code));
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message || 'Failed to fetch ILOs');
                }
                const data = await res.json();
                if (!mounted) return;
                const flatILOs = [];
                for (const co of data.courseOutcomes) {
                    co.ilos.sort((a, b) => a.id - b.id);
                    co.ilos.forEach(ilo => flatILOs.push({...ilo, co_id: co.co_id}));
                }
                setIloData({course: data.course, courseOutcomes: data.courseOutcomes, ilos: flatILOs});
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchILOs();
        return () => {
            mounted = false;
        };
    }, [code]);


    // course details
    // course details state
    const [courseDetailsData, setCourseDetailsData] = useState({
        code: '',
        name: '',
        description: '',
        credits: '',
        contact: '',
        prerequisites: '',
        class: '',
        cmo: '',
        revision: 0,
        year: '',
        sem: ''
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
                const res = await fetch('http://localhost:5000/api/course-details/' + encodeURIComponent(code));
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message || 'Failed to fetch course details');
                }
                const data = await res.json();
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
                console.error(err);
                if (!mounted) return;
                setCourseDetailsError(err.message);
            } finally {
                if (mounted) setCourseDetailsLoading(false);
            }
        }

        fetchCourseDetails();
        return () => { mounted = false; };
    }, [code]);

    // co po alignment
    // state for course-program outcome alignment
    const [cpaData, setCpaData] = useState({
        course: { code: '', title: '' },
        programOutcomes: [], // [{ key: 'PO1', po_id, description }, ...]
        courseOutcomes: []   // [{ id, description, poMappings: ['I','E','', ...] }, ...]
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
                const res = await fetch('http://localhost:5000/api/course-outcome-alignment/' + encodeURIComponent(code));
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message || 'Failed to fetch course-program outcome alignment');
                }
                const data = await res.json();
                if (!mounted) return;

                setCpaData({
                    course: data.course ?? { code: '', title: '' },
                    programOutcomes: data.programOutcomes ?? [],
                    courseOutcomes: data.courseOutcomes ?? []
                });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setCpaError(err.message);
            } finally {
                if (mounted) setCpaLoading(false);
            }
        }

        fetchCPA();
        return () => { mounted = false; };
    }, [code]);

    // criteria
    // state for Criteria for Grading (separate from syllabus)
    const [criteriaData, setCriteriaData] = useState({
        gradingSystem: [] // array of groups { co: 'CO1', ilos: [ { id:'ILO1', assessments:'', weight:{prelim,midterm,semi,final}, minPassing } ] }
    });
    const [criteriaLoading, setCriteriaLoading] = useState(false);
    const [criteriaError, setCriteriaError] = useState(null);

    useEffect(() => {
        if (!code) return;
        let mounted = true;

        async function fetchCriteria() {
            setCriteriaLoading(true);
            setCriteriaError(null);
            try {
                const res = await fetch('http://localhost:5000/api/course-criteria/' + encodeURIComponent(code));
                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.message || `Failed to fetch course criteria (${res.status})`);
                }
                const data = await res.json();
                if (!mounted) return;

                setCriteriaData({
                    gradingSystem: Array.isArray(data.gradingSystem) ? data.gradingSystem : []
                });
            } catch (err) {
                console.error('fetchCriteria error', err);
                if (!mounted) return;
                setCriteriaError(err.message);
                setCriteriaData({ gradingSystem: [] });
            } finally {
                if (mounted) setCriteriaLoading(false);
            }
        }

        fetchCriteria();
        return () => { mounted = false; };
    }, [code]);



    return(
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link  to={`/`} className={'actionLink'} >
                    <div className={styles.return}>
                        <ChevronLeft size={22}/>
                    </div>
                </Link>


                <div className={styles['section-select']}>
                    <select value={selectedSection} onChange={handleSectionChange}>
                        <option value="Course Details">Course Details</option>
                        <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                        <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                        <option value="Criteria for Grading">Criteria for Grading</option>
                    </select>
                </div>
                <div  className={styles.more}>
                    <Info strokeWidth={2} size={16}/>
                </div>
                <div className={styles.draft}>
                    <Play size={14} />
                    Preview

                </div>

                <div onClick={() => setIsPreviewOpen(true)} className={styles.submit}>
                    <Send size={14}/>
                    Submit
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
                                                {courseDetailsData?.description || ''}
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
                                            <th className={stylesB.labelCell}>Syllabus Revision No.</th>
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
                                                    : // fallback to PO1..PO9 if none returned
                                                    ['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9'].map(po => (
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
                                                        {(cpaData.programOutcomes.length > 0 ? cpaData.programOutcomes : Array(9).fill(null)).map((po, idx) => (
                                                            <td key={idx} className={stylesB.mappingCell}>
                                                                {co.poMappings && co.poMappings[idx] ? co.poMappings[idx] : ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr className={styles.emptyRow}>
                                                    <td colSpan={(cpaData.programOutcomes.length || 9) + 1}>
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


                        {selectedSection === 'Intended Learning Outcomes' &&
                            <section>
                                <div className={styles['ilo-container']}>
                                    <table>
                                        <thead>
                                        <tr>
                                            <th width={150}>Entry ID</th>
                                            <th width={800}>Description</th>
                                            <th></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {iloData.ilos && iloData.ilos.length > 0 ? (
                                            iloData.ilos.map((ilo, index) => {
                                                const coNumber = ilo.co_id;
                                                const iloNumber = (index % 3) + 1;
                                                const entryLabel = `CO${coNumber}-ILO${iloNumber}`;

                                                return (
                                                    <tr key={ilo.id}>
                                                        <td width={150} style={{ fontWeight: 400 }}>{entryLabel}</td>
                                                        <td width={800}>{ilo.description}</td>
                                                        <td className={styles.fill}
                                                            style={{
                                                                display: "flex", flexDirection: "column",
                                                                alignItems: "end", gap: 5,
                                                            }}>
                                                            <Link className={'actionLink'} to={`/references/form/${code}/${ilo.id}`}>
                                                                Assign References <ChevronRight size={18} />
                                                            </Link>
                                                            <Link className={'actionLink'} to={`/topics/form/${code}/${ilo.id}`}>
                                                                Assign Topics <ChevronRight size={18} />
                                                            </Link>
                                                            <Link className={'actionLink'} to={`/tlas/form/${code}/${ilo.id}`}>
                                                                Assign TLAs <ChevronRight size={18} />
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr className={styles.emptyRow}>
                                                <td colSpan={2}>
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
                        }




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
                                    <div className={stylesB.tableScrollWrapper}>
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


                        <SyllabusPreview
                            isOpen={isPreviewOpen}
                            onClose={() => setIsPreviewOpen(false)}
                        />
                    </>
                )}


            </div>
        </div>
    )
}

export default syllabusSections;