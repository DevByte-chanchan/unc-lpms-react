import React, { useState, Suspense } from "react";
import styles from '../styles/SyllabusPreview.module.sass'; // Ensure this has the new modal CSS classes
import {Link, useParams} from "react-router-dom";
import {getSyllabusByCode, syllabiData} from "../data/syllabiData.js";


const SyllabusPreview = ({ isOpen, onClose }) => {
    // 1. Guard clause for modal visibility
    if (!isOpen) return null;

    // 2. Use local state for tabs instead of URL params for a cleaner modal experience
    const [selectedSection, setSelectedSection] = useState('Course Details');
    const { code } = useParams();

    // Fetch data (ensure this handles undefined gracefully inside the render)
    const syllabus = getSyllabusByCode(code);

    const handleSectionChange = (e) => {
        setSelectedSection(e.target.value);
    }

    // COURSE AND PROGRAM OUTCOME ALIGNMENT
    const courseOutcomes = [
        {
            id: 'CO1',
            description: 'Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.',
            // Mappings for columns 1-9
            poMappings: ['E', '', 'I', '', '', 'E', '', '', 'I']
        },
        {
            id: 'CO2',
            description: 'User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.',
            poMappings: ['', 'E', '', '', '', 'E', '', 'I', '']
        },
        {
            id: 'CO3',
            description: 'Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.',
            poMappings: ['', '', 'D', '', 'D', '', 'I', '', '']
        },
        {
            id: 'CO4',
            description: 'Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.',
            poMappings: ['D', '', '', 'E', '', '', '', 'I', '']
        },
    ];


// --- STATE ---
    const [viewType, setViewType] = useState('Textbook');

    // --- DATA FETCHING ---
    // Ensure safe access to data
    const syllabusR = syllabiData.find((s) => s.code === code) || { references: [] };
    const allReferences = syllabusR.references || [];

    // --- HELPER: GET DATA BY TYPE ---
    const getData = (type) => allReferences.filter(r => r.type === type);

    // --- CONFIG: FIXED COLUMN WIDTHS ---
    // These widths are applied to BOTH th and td to guarantee perfect alignment
    const colWidths = {
        id: '80px',
        title: '400px',
        author: '250px',
        link: '300px',
        year: '150px'
    };

    return (
        // 3. Modal Overlay Wrapper (Matches TOSPreview structure)
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>

                {/* 4. Close Button */}
                <button className={styles.closeButton} onClick={onClose}>×</button>

                <h2 className={styles.previewTitle}>Syllabus Preview</h2>

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

                    <div className={styles.actions}>
                        <div className={styles.submit}>Submit</div>
                    </div>
                </div>

                {/*<hr style={{ border: '0', borderTop: '1px solid #eee', margin: '0 0 20px 0' }} />*/}

                {/* 6. Dynamic Content Area */}
                <div className={styles['dynamic-sections']} style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                    {selectedSection === 'Course Details' &&
                        <section>
                            <div className={styles.courseDetailsContainer}>
                                {/* We wrap the table in a specific class to target it with SASS */}
                                <table className={styles.documentTable}>
                                    <tbody>
                                    {/* Row 1: Course No & Description Header */}
                                    <tr>
                                        <th className={styles.labelCell}>Course No.</th>
                                        <td className={styles.valueCell}>{syllabus?.code || ''}</td>
                                        <th className={styles.descHeader}>Course Description</th>
                                    </tr>

                                    {/* Row 2: Course Title & Description Body (starts rowSpan) */}
                                    <tr>
                                        <th className={styles.labelCell}>Course Title</th>
                                        <td className={styles.valueCell}><strong>{syllabus?.name || ''}</strong></td>
                                        {/* rowSpan=9 covers all remaining rows on the left */}
                                        <td rowSpan="9" className={styles.descCell}>
                                            {syllabus?.description || ''}
                                        </td>
                                    </tr>

                                    {/* Row 3: Credit */}
                                    <tr>
                                        <th className={styles.labelCell}>Credit</th>
                                        <td className={styles.valueCell}>{syllabus?.credits || ''}</td>
                                    </tr>

                                    {/* Row 4: Contact Hours */}
                                    <tr>
                                        <th className={styles.labelCell}>Contact Hours/Week</th>
                                        <td className={styles.valueCell}>{syllabus?.contact || ''}</td>
                                    </tr>

                                    {/* Row 5: Pre-requisites */}
                                    <tr>
                                        <th className={styles.labelCell}>Pre-requisites</th>
                                        <td className={styles.valueCell}>{syllabus?.prerequisites || ''}</td>
                                    </tr>

                                    {/* Row 6: Classification */}
                                    <tr>
                                        <th className={styles.labelCell}>Classification/Field</th>
                                        <td className={styles.valueCell}>{syllabus?.class || ''}</td>
                                    </tr>

                                    {/* Row 7: CMO */}
                                    <tr>
                                        <th className={styles.labelCell}>CMO</th>
                                        <td className={styles.valueCell}>{syllabus?.cmo || ''}</td>
                                    </tr>

                                    {/* Row 8: Revision */}
                                    <tr>
                                        <th className={styles.labelCell}>Syllabus Revision No.</th>
                                        <td className={styles.valueCell}>{syllabus?.revision || '0'}</td>
                                    </tr>

                                    {/* Row 9: Year Level */}
                                    <tr>
                                        <th className={styles.labelCell}>Year Level</th>
                                        <td className={styles.valueCell}>{syllabus?.year || ''}</td>
                                    </tr>

                                    {/* Row 10: Term */}
                                    <tr>
                                        <th className={styles.labelCell}>Term</th>
                                        <td className={styles.valueCell}>{syllabus?.sem || ''}</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>

                        </section>
                    }

                    {selectedSection === 'Course and Program Outcome Alignment' &&

                        <section>
                            <div className={styles['cpa-container']}>

                                {/* Legend - Styled to look like a document note */}
                                <div className={styles.legend}>
                                    <span className={styles.legendTitle}>Legend:</span>
                                    <div className={styles.legendItems}>
                                        <span><strong>I</strong> – Introductory</span>
                                        <span><strong>E</strong> – Enabling</span>
                                        <span><strong>D</strong> – Demonstrative</span>
                                    </div>
                                </div>

                                {/* Scrollable Wrapper */}
                                <div className={styles.tableScrollWrapper}>
                                    <table className={styles.alignmentTable}>
                                        <thead>
                                        <tr>
                                            <th className={styles.firstColHeader}>
                                                After completion of the course, the student should be able to:
                                            </th>
                                            {/* Render PO1 to PO9 headers */}
                                            {['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'].map((po) => (
                                                <th key={po} className={styles.poHeader}>{po}</th>
                                            ))}
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {courseOutcomes.map((co) => (
                                            <tr key={co.id}>
                                                {/* Combined ID and Description Cell */}
                                                <td className={styles.descCell}>
                                                    <strong>{co.id}: </strong>
                                                    {co.description}
                                                </td>

                                                {/* PO Mapping Cells (Read-only) */}
                                                {co.poMappings.slice(0, 9).map((mapping, index) => (
                                                    <td key={index} className={styles.mappingCell}>
                                                        {mapping || ''}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </section>

                    }
                    {selectedSection === 'References' && (
                        <div className={styles.refContainer}>

                            {/* 1. SELECTION BAR (Like the subheader, but for switching tables) */}
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

                            {/* 2. SCROLL WRAPPER (This handles the scroll, mirroring 'tableScrollWrapper') */}
                            <div className={styles.refScrollWrapper}>

                                {/* --- TABLE 1: TEXTBOOKS --- */}
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
                                            <tr key={i}>
                                                <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>TB{i + 1}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>{ref.isbn || '-'}</td>
                                                <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>{ref.year}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className={styles.refEmpty}>No Textbooks found.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                )}

                                {/* --- TABLE 2: OER --- */}
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
                                            <tr key={i}>
                                                <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>OE{i + 1}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>
                                                    <a href={ref.link} target="_blank" rel="noreferrer">{ref.link}</a>
                                                </td>
                                                <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>{ref.year}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className={styles.refEmpty}>No OER found.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                )}

                                {/* --- TABLE 3: ONLINE RESOURCES --- */}
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
                                            <tr key={i}>
                                                <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>OR{i + 1}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                                                <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>
                                                    <a href={ref.link} target="_blank" rel="noreferrer">{ref.link}</a>
                                                </td>
                                                <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>{ref.year}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan={5} className={styles.refEmpty}>No Online Resources found.</td></tr>
                                        )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Criteria for Grading - Preview Block */}
                    {selectedSection === 'Criteria for Grading' && (() => {
                        // --- 1. RETRIEVE DATA ---
                        const gradingSystem = syllabus.gradingSystem || [];

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
                            <div className={styles.criteriaContainer}>
                                <div className={styles.tableScrollWrapper}>
                                    <table className={styles.criteriaTable}>
                                        <thead>
                                        <tr>
                                            <th rowSpan="2" className={styles.headerCell} style={{ width: '100px' }}>COURSE OUTCOME</th>
                                            {/* Adjusted width since description is gone */}
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
                                                            <td className={styles.dataCellCenter}>{ilo.weight?.prelim || ''}</td>
                                                            <td className={styles.dataCellCenter}>{ilo.weight?.midterm || ''}</td>
                                                            <td className={styles.dataCellCenter}>{ilo.weight?.semi || ''}</td>
                                                            <td className={styles.dataCellCenter}>{ilo.weight?.final || ''}</td>

                                                            {/* Min Passing */}
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

                                        {/* Total Row */}
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
                                </div>
                            </div>
                        );
                    })()}
                    {selectedSection === 'Course Coverage' && (() => {
                        // --- 1. DATA PREPARATION ---
                        const ilos = syllabus.ilos || [];
                        const allTopics = syllabus.topics || [];
                        const allAssessments = syllabus.assessments || [];

                        // Columns Configuration (Fixed Widths)
                        // Adjusted: TLA column is now wider to accommodate the merged content
                        const colWidths = {
                            co: '60px',
                            ilo: '220px',
                            topic: '250px',
                            period: '100px',
                            tla: '350px', // Merged Column Width
                            assess: '220px',
                            ref: '100px'
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
                                    // Case-insensitive check for phase
                                    const filtered = topic.tlas.filter(t => t.classPhase.toLowerCase() === phase.toLowerCase());
                                    tlas = [...tlas, ...filtered];
                                }
                            });
                            return tlas;
                        };

                        // Helper: Find Assessments for a list of TLAs
                        const getAssessmentsForTLAs = (tlas) => {
                            return tlas.map(tla =>
                                allAssessments.find(a => a.tlaName === tla.tlaName)
                            ).filter(Boolean);
                        };

                        const getRefId = (refString) => refString.split(' - ')[0];

                        // Helper Component for Rendering a TLA Group (Pre/In/Post)
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
                                                {/* Lab Tag connects to the name */}
                                                {tla.laboratory && <span className={styles.labTag}> (Lab)</span>}
                                            </div>
                                            <div className={styles.descText}>{tla.tlaDescription}</div>
                                        </div>
                                    ))}
                                </div>
                            );
                        };

                        // --- 2. RENDER ---
                        return (
                            <div className={styles.ccContainer}>
                                <div className={styles.ccScrollWrapper}>
                                    <table className={styles.ccTable}>
                                        <thead>
                                        <tr>
                                            <th className={styles.ccHeader} style={{ width: colWidths.co }}>CO</th>
                                            <th className={styles.ccHeader} style={{ width: colWidths.ilo }}>ILO</th>
                                            <th className={styles.ccHeader} style={{ width: colWidths.topic }}>TOPIC</th>
                                            <th className={styles.ccHeader} style={{ width: colWidths.period }}>PERIOD</th>
                                            {/* MERGED TLA COLUMN */}
                                            <th className={styles.ccHeader} style={{ width: colWidths.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                                            <th className={styles.ccHeader} style={{ width: colWidths.assess }}>ASSESSMENT</th>
                                            <th className={styles.ccHeader} style={{ width: colWidths.ref }}>RESOURCES</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {ilos.length > 0 ? ilos.map((ilo, index) => {
                                            const isFirstOfCO = index % 3 === 0;
                                            const rowTopics = getILOTopics(ilo);

                                            // Group TLAs
                                            const preTLAs = getTLAsByPhase(rowTopics, 'Pre-class');
                                            const inTLAs = getTLAsByPhase(rowTopics, 'In-class');
                                            const postTLAs = getTLAsByPhase(rowTopics, 'Post-class');

                                            // Collect for Assessments
                                            const allRowTLAs = [...preTLAs, ...inTLAs, ...postTLAs];
                                            const uniqueAssessments = [...new Set(getAssessmentsForTLAs(allRowTLAs))];

                                            // CLEAN ILO ID: "CO1-ILO1" -> "ILO1"
                                            const cleanILOId = ilo.id.includes('-') ? ilo.id.split('-')[1] : ilo.id;

                                            return (
                                                <tr key={ilo.id}>
                                                    {/* CO COLUMN */}
                                                    {isFirstOfCO && (
                                                        <td rowSpan={3} className={`${styles.ccCell} ${styles.centerText} ${styles.boldText}`} style={{ width: colWidths.co }}>
                                                            {ilo.id.split('-')[0]}
                                                        </td>
                                                    )}

                                                    {/* ILO COLUMN (Fixed ID display) */}
                                                    <td className={styles.ccCell} style={{ width: colWidths.ilo }}>
                                                        <div className={styles.boldText} style={{marginBottom: '5px'}}>
                                                            {cleanILOId}
                                                        </div>
                                                        {ilo.intendedLearningOutcome}
                                                    </td>

                                                    {/* TOPIC COLUMN */}
                                                    <td className={styles.ccCell} style={{ width: colWidths.topic }}>
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

                                                    {/* PERIOD COLUMN */}
                                                    <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: colWidths.period }}>
                                                        <div className={styles.boldText}>{ilo.deliveryWeek}</div>
                                                        <div>{ilo.allocatedTime}</div>
                                                    </td>

                                                    {/* MERGED TLA COLUMN */}
                                                    <td className={styles.ccCell} style={{ width: colWidths.tla }}>
                                                        <TlaGroup title="PRE-CLASS" tlas={preTLAs} />
                                                        <TlaGroup title="IN-CLASS" tlas={inTLAs} />
                                                        <TlaGroup title="POST-CLASS" tlas={postTLAs} />

                                                        {/* Fallback if empty */}
                                                        {allRowTLAs.length === 0 && <span className={styles.descText}>No activities listed.</span>}
                                                    </td>

                                                    {/* ASSESSMENT COLUMN */}
                                                    <td className={styles.ccCell} style={{ width: colWidths.assess }}>
                                                        {uniqueAssessments.map((assess, i) => (
                                                            <div key={i} className={styles.assessItem}>
                                                                <div className={styles.boldText}>{assess.tlaName}</div>
                                                                <div className={styles.descText}>{assess.assessmentMethod}</div>
                                                                {assess.hasRubric && <div className={styles.rubricTag}>Rubric Available</div>}
                                                            </div>
                                                        ))}
                                                    </td>

                                                    {/* RESOURCES COLUMN */}
                                                    <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: colWidths.ref }}>
                                                        {ilo.references.map((ref, i) => (
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