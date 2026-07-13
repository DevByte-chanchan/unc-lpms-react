import React, { useState, useEffect, Suspense } from "react";
import styles from '../styles/SyllabusPreview.module.sass';
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchJson } from "../utils/api";

const SyllabusPreview = ({ isOpen, onClose }) => {
    // 1. Guard clause for modal visibility
    if (!isOpen) return null;

    // 2. Use local state for tabs instead of URL params for a cleaner modal experience
    const [selectedSection, setSelectedSection] = useState('Course Details');
    const { code } = useParams();

    const handleSectionChange = (e) => {
        setSelectedSection(e.target.value);
    }

    // ==========================================
    // COURSE DETAILS STATE
    // ==========================================
    const [courseDetailsData, setCourseDetailsData] = useState({
        code: '', name: '', description: '', credits: '', contact: '',
        prerequisites: '', class: '', cmo: '', revision: 0, year: '', sem: ''
    });
    const [courseDetailsLoading, setCourseDetailsLoading] = useState(false);
    const [courseDetailsError, setCourseDetailsError] = useState(null);

    useEffect(() => {
        if (!code || selectedSection !== 'Course Details') return;
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
                console.error(err);
                if (!mounted) return;
                setCourseDetailsError(err.message);
            } finally {
                if (mounted) setCourseDetailsLoading(false);
            }
        }

        fetchCourseDetails();
        return () => { mounted = false; };
    }, [code, selectedSection]);

    // ==========================================
    // CO PO ALIGNMENT STATE
    // ==========================================
    const [cpaData, setCpaData] = useState({
        course: { code: '', title: '' }, programOutcomes: [], courseOutcomes: []
    });
    const [cpaLoading, setCpaLoading] = useState(false);
    const [cpaError, setCpaError] = useState(null);

    useEffect(() => {
        if (!code || selectedSection !== 'Course and Program Outcome Alignment') return;
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
                console.error(err);
                if (!mounted) return;
                setCpaError(err.message);
            } finally {
                if (mounted) setCpaLoading(false);
            }
        }

        fetchCPA();
        return () => { mounted = false; };
    }, [code, selectedSection]);

    // ==========================================
    // CRITERIA FOR GRADING STATE
    // ==========================================
    const [criteriaData, setCriteriaData] = useState({ gradingSystem: [] });
    const [criteriaLoading, setCriteriaLoading] = useState(false);
    const [criteriaError, setCriteriaError] = useState(null);

    useEffect(() => {
        if (!code || selectedSection !== 'Criteria for Grading') return;
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
    }, [code, selectedSection]);

    // ==========================================
    // COURSE COVERAGE DATA LAYER
    // ==========================================
    const [coverageData, setCoverageData] = useState({ ilos: [], topics: [], assessments: [] });
    const [isMatrixLoading, setIsMatrixLoading] = useState(true);

    useEffect(() => {
        if (!code || selectedSection !== 'Course Coverage') return;
        let mounted = true;

        async function fetchLiveCoverageMatrix() {
            try {
                setIsMatrixLoading(true);
                const data = await fetchJson(`/api/course-coverage/${encodeURIComponent(code)}`);

                if (!mounted) return;
                setCoverageData(data);
            } catch (err) {
                console.error("Error communicating with dynamic course coverage components:", err);
            } finally {
                if (mounted) setIsMatrixLoading(false);
            }
        }

        fetchLiveCoverageMatrix();

        return () => {
            mounted = false;
        };
    }, [code, selectedSection]);

    // ==========================================
    // REFERENCE SUMMARY DATA LAYER
    // ==========================================
    const [viewType, setViewType] = useState('Textbook');
    const [referenceData, setReferenceData] = useState(null);
    const [isReferencesLoading, setIsReferencesLoading] = useState(false);

    useEffect(() => {
        if (!code || selectedSection !== 'References') return;
        let mounted = true;

        async function fetchReferenceSummaryData() {
            try {
                setIsReferencesLoading(true);
                const data = await fetchJson(`/api/courses/${encodeURIComponent(code)}/references`);

                if (!mounted) return;
                setReferenceData(data);
            } catch (err) {
                console.error("Error fetching reference summary data:", err);
            } finally {
                if (mounted) setIsReferencesLoading(false);
            }
        }

        fetchReferenceSummaryData();

        return () => {
            mounted = false;
        };
    }, [code, selectedSection]);

    const referenceSummaryPayload = referenceData || {};

    const getData = (type) => {
        if (!referenceSummaryPayload) return [];

        if (Array.isArray(referenceSummaryPayload[type])) {
            return referenceSummaryPayload[type];
        }

        if (referenceSummaryPayload.data && Array.isArray(referenceSummaryPayload.data[type])) {
            return referenceSummaryPayload.data[type];
        }

        const fallbackArray = referenceSummaryPayload.references || referenceSummaryPayload.data?.references;
        if (Array.isArray(fallbackArray)) {
            return fallbackArray.filter(ref => ref.type?.toLowerCase() === type.toLowerCase());
        }

        return [];
    };

    // --- CONFIG: FIXED COLUMN WIDTHS ---
    const colWidths = {
        id: '70px',
        title: '300px',
        author: '200px',
        link: '200px',
        year: '100px'
    };

    const navigate = useNavigate();
    const goBackHandler = () => {
        navigate(-1);
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>

                {/* 4. Close Button */}
                <button className={styles.closeButton} onClick={onClose}>×</button>

                <h2 className={styles.previewTitle}>Learning Plan Preview</h2>

                {/* 5. Header / Navigation Bar adapted for Modal */}
                <div className={styles.navi} style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                    <div className={styles['section-select']}>
                        <select value={selectedSection} onChange={handleSectionChange}>
                            <option value="Course Details">Course Details</option>
                            <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                            <option value="Course Coverage">Course Coverage</option>
                            <option value="References">References</option>
                            <option value="Criteria for Grading">Criteria for Grading</option>
                        </select>
                    </div>
                </div>

                {/* 6. Dynamic Content Area */}
                <div className={styles['dynamic-sections']} style={{ overflowY: 'auto', maxHeight: '60vh' }}>

                    {/* ---------------- COURSE DETAILS ---------------- */}
                    {selectedSection === 'Course Details' &&
                        <section>
                            <div className={styles.courseDetailsContainer}>
                                {courseDetailsLoading ? (
                                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading course details...</div>
                                ) : (
                                    <table className={styles.documentTable}>
                                        <tbody>
                                        <tr>
                                            <th className={styles.labelCell}>Course No.</th>
                                            <td className={styles.valueCell}>{courseDetailsData.code}</td>
                                            <th className={styles.descHeader}>Course Description</th>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Course Title</th>
                                            <td className={styles.valueCell}><strong>{courseDetailsData.name}</strong></td>
                                            <td rowSpan="9" className={styles.descCell}>
                                                {courseDetailsData.description}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Credit</th>
                                            <td className={styles.valueCell}>{courseDetailsData.credits}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Contact Hours/Week</th>
                                            <td className={styles.valueCell}>{courseDetailsData.contact}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Pre-requisites</th>
                                            <td className={styles.valueCell}>{courseDetailsData.prerequisites}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Classification/Field</th>
                                            <td className={styles.valueCell}>{courseDetailsData.class}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>CMO</th>
                                            <td className={styles.valueCell}>{courseDetailsData.cmo}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Learning Plan Revision No.</th>
                                            <td className={styles.valueCell}>{courseDetailsData.revision}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Year Level</th>
                                            <td className={styles.valueCell}>{courseDetailsData.year}</td>
                                        </tr>
                                        <tr>
                                            <th className={styles.labelCell}>Term</th>
                                            <td className={styles.valueCell}>{courseDetailsData.sem}</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>
                    }

                    {/* ---------------- CO PO ALIGNMENT ---------------- */}
                    {selectedSection === 'Course and Program Outcome Alignment' &&
                        <section>
                            <div className={styles['cpa-container']}>
                                <div className={styles.legend}>
                                    <span className={styles.legendTitle}>Legend:</span>
                                    <div className={styles.legendItems}>
                                        <span><strong>I</strong> – Introductory</span>
                                        <span><strong>E</strong> – Enabling</span>
                                        <span><strong>D</strong> – Demonstrative</span>
                                    </div>
                                </div>
                                <div className={styles.tableScrollWrapper}>
                                    {cpaLoading ? (
                                        <div style={{ padding: '20px', textAlign: 'center' }}>Loading alignment data...</div>
                                    ) : (
                                        <table className={styles.alignmentTable}>
                                            <thead>
                                            <tr>
                                                <th className={styles.firstColHeader}>
                                                    After completion of the course, the student should be able to:
                                                </th>
                                                {['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9', 'PO10', 'PO11', 'PO12', 'PO13'].map((po) => (
                                                    <th key={po} className={styles.poHeader}>{po}</th>
                                                ))}
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {cpaData.courseOutcomes.length > 0 ? (
                                                cpaData.courseOutcomes.map((co) => (
                                                    <tr key={co.id}>
                                                        <td className={styles.descCell}>
                                                            <strong>{co.id}: </strong>
                                                            {co.description}
                                                        </td>
                                                        {co.poMappings && co.poMappings.slice(0, 13).map((mapping, index) => (
                                                            <td key={index} className={styles.mappingCell}>
                                                                {mapping || ''}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="14" style={{ padding: '20px', textAlign: 'center' }}>No outcomes aligned yet.</td>
                                                </tr>
                                            )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </section>
                    }

                    {/* ---------------- REFERENCES ---------------- */}
                    {selectedSection === 'References' && (
                        <div className={styles.refContainer}>
                            <div className={styles.refHeaderBar}>
                                <select
                                    value={viewType}
                                    onChange={(e) => setViewType(e.target.value)}
                                    className={styles.refSelect}
                                >
                                    <option value="Textbook">TEXTBOOKS</option>
                                    <option value="Open Educational Resources">OPEN EDUCATIONAL RESOURCES</option>
                                    <option value="Online Resources">ONLINE RESOURCES</option>
                                </select>
                                <div className={styles.refArrow}>▼</div>
                            </div>

                            <div className={styles.refScrollWrapper}>
                                {isReferencesLoading ? (
                                    <div style={{ padding: '20px', textAlign: 'center' }}>Loading references...</div>
                                ) : (
                                    <>
                                        {/* TABLE 1: TEXTBOOKS */}
                                        {viewType === 'Textbook' && (
                                            <table className={styles.refTable}>
                                                <thead>
                                                <tr>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.link }}>ISBN</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {getData('Textbook').length > 0 ? getData('Textbook').map((ref, i) => (
                                                    <tr key={ref.id || i}>
                                                        <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>TB{i + 1}</td>
                                                        <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                        <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                        <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>{ref.isbn || '-'}</td>
                                                        <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>
                                                            {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={5} className={styles.refEmpty}>No Textbooks found.</td></tr>
                                                )}
                                                </tbody>
                                            </table>
                                        )}

                                        {/* TABLE 2: OER */}
                                        {viewType === 'Open Educational Resources' && (
                                            <table className={styles.refTable}>
                                                <thead>
                                                <tr>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                                                    <th className={styles.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {getData('Open Educational Resources').length > 0 ? getData('Open Educational Resources').map((ref, i) => (
                                                    <tr key={ref.id || i}>
                                                        <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>OE{i + 1}</td>
                                                        <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                        <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                        <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>
                                                             {ref.link && ref.link !== '#' ? (
                                                                 <a href={ref.link} target="_blank" rel="noreferrer" className={styles.refUrlLink}>{ref.link}</a>
                                                             ) : '-'}
                                                         </td>
                                                         <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>
                                                             {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                         </td>
                                                     </tr>
                                                 )) : (
                                                     <tr><td colSpan={5} className={styles.refEmpty}>No OER found.</td></tr>
                                                 )}
                                                 </tbody>
                                             </table>
                                         )}

                                         {/* TABLE 3: ONLINE RESOURCES */}
                                         {viewType === 'Online Resources' && (
                                             <table className={styles.refTable}>
                                                 <thead>
                                                 <tr>
                                                     <th className={styles.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                                                     <th className={styles.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                                                     <th className={styles.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                                                     <th className={styles.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                                                     <th className={styles.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                                                 </tr>
                                                 </thead>
                                                 <tbody>
                                                 {getData('Online Resources').length > 0 ? getData('Online Resources').map((ref, i) => (
                                                     <tr key={ref.id || i}>
                                                         <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>OR{i + 1}</td>
                                                         <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                         <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                         <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>
                                                             {ref.link && ref.link !== '#' ? (
                                                                 <a href={ref.link} target="_blank" rel="noreferrer" className={styles.refUrlLink}>{ref.link}</a>
                                                            ) : '-'}
                                                        </td>
                                                        <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>
                                                            {ref.year && ref.year !== '-' ? String(ref.year).split('-')[0] : '-'}
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={5} className={styles.refEmpty}>No Online Resources found.</td></tr>
                                                )}
                                                </tbody>
                                            </table>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ---------------- CRITERIA FOR GRADING ---------------- */}
                    {selectedSection === 'Criteria for Grading' && (() => {
                        const gradingSystem = criteriaData.gradingSystem || [];

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

                        return (
                            <div className={styles.criteriaContainer}>
                                <div className={styles.tableScrollWrapper}>
                                    {criteriaLoading ? (
                                        <div style={{ padding: '20px', textAlign: 'center' }}>Loading criteria...</div>
                                    ) : (
                                        <table className={styles.criteriaTable}>
                                            <thead>
                                            <tr>
                                                <th rowSpan="2" className={styles.headerCell} style={{ width: '100px' }}>COURSE OUTCOME</th>
                                                <th rowSpan="2" className={styles.headerCell} style={{ width: '80px' }}>ILO #</th>
                                                <th rowSpan="2" className={styles.headerCell}>ASSESSMENTS</th>
                                                <th colSpan="4" className={styles.headerCell}>WEIGHT %</th>
                                                <th rowSpan="2" className={styles.headerCell}>MIN PASSING %</th>
                                            </tr>
                                            <tr className={styles.subHeaderRow}>
                                                <th className={styles.subHeader}>Prelim</th>
                                                <th className={styles.subHeader}>Midterm</th>
                                                <th className={styles.subHeader}>Semi</th>
                                                <th className={styles.subHeader}>Final</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {gradingSystem.length > 0 ? (
                                                gradingSystem.map((group) => (
                                                    <React.Fragment key={group.co}>
                                                        {group.ilos.map((ilo, index) => (
                                                            <tr key={`${group.co}-${ilo.id}`}>
                                                                {index === 0 && (
                                                                    <td rowSpan={group.ilos.length} className={styles.coCell}>
                                                                        <strong>{group.co}</strong>
                                                                    </td>
                                                                )}
                                                                <td className={styles.dataCellCenter}>
                                                                    <span style={{ fontWeight: '500' }}>{ilo.id}</span>
                                                                </td>
                                                                <td className={styles.dataCellCenter}>
                                                                    {Array.isArray(ilo.assessments)
                                                                        ? ilo.assessments.join(', ')
                                                                        : ilo.assessments}
                                                                </td>
                                                                <td className={styles.dataCellCenter}>{ilo.weight?.prelim || ''}</td>
                                                                <td className={styles.dataCellCenter}>{ilo.weight?.midterm || ''}</td>
                                                                <td className={styles.dataCellCenter}>{ilo.weight?.semi || ''}</td>
                                                                <td className={styles.dataCellCenter}>{ilo.weight?.final || ''}</td>
                                                                <td className={styles.dataCellCenter}>{ilo.minPassing}</td>
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

                                            <tr className={styles.totalRow}>
                                                <td colSpan="3" className={styles.totalLabel}>TOTAL</td>
                                                <td className={styles.dataCellCenter}>{calculateTotal('prelim')}%</td>
                                                <td className={styles.dataCellCenter}>{calculateTotal('midterm')}%</td>
                                                <td className={styles.dataCellCenter}>{calculateTotal('semi')}%</td>
                                                <td className={styles.dataCellCenter}>{calculateTotal('final')}%</td>
                                                <td></td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ---------------- COURSE COVERAGE ---------------- */}
                    {selectedSection === 'Course Coverage' && (() => {
                        const ilos = coverageData.ilos || [];
                        const allTopics = coverageData.topics || [];
                        const allAssessments = coverageData.assessments || [];

                        const colWidthsCC = {
                            co: '45px', ilo: '170px', topic: '195px',
                            period: '90px', tla: '300px', assess: '220px', ref: '110px'
                        };

                        const getILOTopics = (ilo) => {
                            if (!ilo.topics) return [];
                            return ilo.topics.map(topicTitle =>
                                allTopics.find(t => t.title === topicTitle)
                            ).filter(Boolean);
                        };

                        const getTLAsByPhase = (topics, phase) => {
                            let tlas = [];
                            topics.forEach(topic => {
                                if (topic.tlas) {
                                    const filtered = topic.tlas.filter(t => t.classPhase.toLowerCase() === phase.toLowerCase());
                                    tlas = [...tlas, ...filtered];
                                }
                            });
                            return tlas;
                        };

                        const getAssessmentsForTLAs = (tlas) => {
                            return tlas.map(tla =>
                                allAssessments.find(a => a.tlaName === tla.tlaName)
                            ).filter(Boolean);
                        };

                        const getRefId = (refString) => {
                            if (typeof refString !== 'string') return '';
                            return refString.split(' - ')[0];
                        };

                        const TlaGroup = ({ title, tlas }) => {
                            if (!tlas || tlas.length === 0) return null;
                            return (
                                <div className={styles.tlaGroupBlock}>
                                    <div className={styles.tlaPhaseHeader}>{title}</div>
                                    {tlas.map(tla => (
                                        <div key={tla.id} className={styles.tlaItem}>
                                            <div className={styles.tlaNameLine}>
                                                <span className={styles.perfTag}>
                                                    {tla.performedBy === 'Instructor' ? '[I]' : '[S]'}
                                                </span>
                                                <span className={styles.boldText}> {tla.tlaName}</span>
                                                {tla.laboratory && <span className={styles.labTag}> (Lab)</span>}
                                            </div>
                                            <div className={styles.descText}>{tla.tlaDescription}</div>
                                        </div>
                                    ))}
                                </div>
                            );
                        };

                        return (
                            <div className={styles.ccContainer}>
                                <div className={styles.ccScrollWrapper}>
                                    {isMatrixLoading ? (
                                        <div style={{ padding: '20px', textAlign: 'center' }}>Loading coverage matrix...</div>
                                    ) : (
                                        <table className={styles.ccTable}>
                                            <thead>
                                            <tr>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.co }}>CO</th>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.ilo }}>ILO</th>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.topic }}>TOPIC</th>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.period }}>PERIOD</th>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.assess }}>ASSESSMENT</th>
                                                <th className={styles.ccHeader} style={{ width: colWidthsCC.ref, overflowWrap: 'break-word', wordBreak: 'break-all' }}>RESOURCES</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {ilos.length > 0 ? ilos.map((ilo, index) => {
                                                const currentCoPrefix = ilo.id?.split('-')[0] || '';
                                                // Consecutive-run safe rowspan: no overlap when COs aren't contiguous
                                                const prevCoPrefix = index > 0 ? (ilos[index - 1].id?.split('-')[0] || '') : null;
                                                const isFirstOfCO = currentCoPrefix !== prevCoPrefix;
                                                let coRowCount = 1;
                                                if (isFirstOfCO) {
                                                    for (let j = index + 1; j < ilos.length && (ilos[j].id?.split('-')[0] || '') === currentCoPrefix; j++) {
                                                        coRowCount++;
                                                    }
                                                }
                                                const rowTopics = getILOTopics(ilo);

                                                const preTLAs = getTLAsByPhase(rowTopics, 'Pre-class');
                                                const inTLAs = getTLAsByPhase(rowTopics, 'In-class');
                                                const postTLAs = getTLAsByPhase(rowTopics, 'Post-class');

                                                const allRowTLAs = [...preTLAs, ...inTLAs, ...postTLAs];
                                                const uniqueAssessments = [...new Set(getAssessmentsForTLAs(allRowTLAs))];
                                                const cleanILOId = ilo.id?.includes('-') ? ilo.id.split('-')[1] : ilo.id;

                                                return (
                                                    <tr key={ilo.id}>
                                                        {isFirstOfCO && (
                                                            <td rowSpan={coRowCount} className={`${styles.ccCell} ${styles.centerText} ${styles.boldText}`} style={{ width: colWidthsCC.co }}>
                                                                {currentCoPrefix}
                                                            </td>
                                                        )}
                                                        <td className={styles.ccCell} style={{ width: colWidthsCC.ilo }}>
                                                            <div className={styles.boldText} style={{marginBottom: '5px'}}>
                                                                {cleanILOId}
                                                            </div>
                                                            {ilo.intendedLearningOutcome}
                                                        </td>
                                                        <td className={styles.ccCell} style={{ width: colWidthsCC.topic }}>
                                                            {rowTopics.map(t => (
                                                                <div key={t.id} className={styles.topicBlock}>
                                                                    <div className={styles.topicTitle}>{t.title}</div>
                                                                    <ul className={styles.subtopicList}>
                                                                        {t.subtopics && t.subtopics.map(sub => (
                                                                            <li key={sub.id}>{sub.value}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            ))}
                                                        </td>
                                                        <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: colWidthsCC.period }}>
                                                            <div className={styles.boldText}>{ilo.deliveryWeek}</div>
                                                            <div>{ilo.allocatedTime}</div>
                                                        </td>
                                                        <td className={styles.ccCell} style={{ width: colWidthsCC.tla }}>
                                                            <TlaGroup title="PRE-CLASS" tlas={preTLAs} />
                                                            <TlaGroup title="IN-CLASS" tlas={inTLAs} />
                                                            <TlaGroup title="POST-CLASS" tlas={postTLAs} />
                                                            {allRowTLAs.length === 0 && <span className={styles.descText}>No activities listed.</span>}
                                                        </td>
                                                        <td className={styles.ccCell} style={{ width: colWidthsCC.assess }}>
                                                            {uniqueAssessments.map((assess, i) => (
                                                                <div key={i} className={styles.assessItem}>
                                                                    <div className={styles.boldText}>{assess.tlaName}</div>
                                                                    <div className={styles.descText}>{assess.assessmentMethod}</div>
                                                                </div>
                                                            ))}
                                                        </td>
                                                        <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: colWidthsCC.ref }}>
                                                            {ilo.references && ilo.references.map((ref, i) => (
                                                                <div key={i}>{getRefId(ref)}</div>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                );
                                            }) : (
                                                <tr><td colSpan={7} style={{padding: '20px', textAlign: 'center'}}>No coverage data available.</td></tr>
                                            )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                </div>
            </div>
        </div>
    );
}

export default SyllabusPreview;