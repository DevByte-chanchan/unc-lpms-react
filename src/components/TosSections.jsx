import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft} from 'react-feather';
import React, {useEffect, useRef, useState} from "react";
import {useNavigate, useSearchParams, useLocation, useParams} from "react-router-dom";
import layout from "../styles/TosSections.module.sass";
import TOSPreview from "../pages/TosPreview.jsx";
import TOSSummary from "../pages/TosSummary.jsx";
import QuestionCognitiveMapping from "../pages/QuestionCognitiveMapping.jsx";
import BuilderNavigation from "../components/BuilderNavigation.jsx";
import { fetchOutcomes, fetchItems, saveOutcomes, saveItems } from '../services/api.js';

const tosSections = ({status}) => {

    const [questions, setQuestions] = useState([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [assessmentMode] = useState("question");
    const [rubricCategories, setRubricCategories] = useState([]);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Outcome Overview';
    const getDefaultOutlines = () => [
        {
            co: "CO1",
            description: "Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.",
            totalHours: 12,
            totalPercentage: 100,
            totalItems: 20,
            ilos: [
                { id: "ILO1", description: "Analyze the relationship between cognitive psychology and human-computer interaction.", hours: 3, percentage: 20, items: 4 },
                { id: "ILO2", description: "Synthesize user research data into actionable user personas and empathy maps.", hours: 3, percentage: 30, items: 6 },
                { id: "ILO3", description: "Structure information architecture effectively using card sorting techniques.", hours: 6, percentage: 50, items: 10 },
            ]
        },
        {
            co: "CO2",
            description: "User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.",
            totalHours: 12,
            totalPercentage: 100,
            totalItems: 30,
            ilos: [
                { id: "ILO1", description: "Apply Nielsen's 10 Usability Heuristics to critique existing interface designs.", hours: 3, percentage: 20, items: 6 },
                { id: "ILO2", description: "Create low-fidelity wireframes that solve specific user pain points.", hours: 3, percentage: 30, items: 9 },
                { id: "ILO3", description: "Apply Gestalt principles and color theory to enhance UI readability.", hours: 6, percentage: 50, items: 15 }
            ]
        }
    ];
    const location = useLocation();
    const { code: courseCode } = useParams();
    const tosStatus = location.state?.tosStatus || 'draft';
    const courseName = location.state?.courseName || courseCode;
    const defaultRows = getDefaultOutlines();

    const [rows, setRows] = useState(defaultRows);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [tosErrors, setTosErrors] = useState([]);
    const [showTosErrorModal, setShowTosErrorModal] = useState(false);
    const [errorFields, setErrorFields] = useState({});
    const [exportErrors, setExportErrors] = useState({ outcomeOverview: [], assessmentMapping: [], tosSummary: [] });
    const [showExportErrorModal, setShowExportErrorModal] = useState(false);

    useEffect(() => {
        if (!courseCode || dataLoaded) return;
        setDataLoaded(true);
        fetchOutcomes(courseCode).then(data => {
            if (!data) return;
            const mapped = data.map(o => ({
                co: o.co,
                description: o.description || '',
                totalHours: (o.ilos || []).reduce((s, i) => s + (i.hours || 0), 0),
                totalPercentage: (o.ilos || []).reduce((s, i) => s + (i.percentage || 0), 0),
                totalItems: o.totalItems || 0,
                ilos: (o.ilos || []).map((ilo, idx) => ({
                    id: `ILO${idx + 1}`,
                    description: ilo.description || '',
                    hours: ilo.hours || 0,
                    percentage: ilo.percentage || 0,
                    items: ilo.items || 0
                }))
            }));
            setRows(mapped.length ? mapped : getDefaultOutlines());
        }).catch(() => {
            setRows(getDefaultOutlines());
        });
        fetchItems(courseCode).then(data => {
            if (data && data.length) setQuestions(data);
        }).catch(() => {});
    }, [courseCode, dataLoaded]);

    const clearFieldError = (key) => {
        setErrorFields(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    // ── Outcome Overview helpers ──────────────────────────────────────────────

    // When total CO items changes → redistribute to ILOs by percentage
    const handleTotalItemsChange = (coIndex, value) => {
        clearFieldError(`oo-totalItems-${coIndex}`);
        setRows(prev => {
            const updated = prev.map((co, i) => {
                if (i !== coIndex) return co;
                const cleaned = value.replace(/[^0-9]/g, '');
                const total = cleaned === "" ? 0 : Math.min(Number(cleaned), 100);
                const newIlos = co.ilos.map(ilo => ({ ...ilo }));

                if (total !== "") {
                    let runningSum = 0;
                    newIlos.forEach((ilo, idx) => {
                        if (idx < newIlos.length - 1) {
                            const allocated = Math.round((ilo.percentage / 100) * total);
                            ilo.items = allocated;
                            runningSum += allocated;
                        } else {
                            ilo.items = total - runningSum;
                        }
                    });
                }

                return { ...co, totalItems: total, ilos: newIlos };
            });
            return updated;
        });
    };

    // When an individual ILO item count changes → recalculate CO total as sum of ILOs
    const handleItemsChange = (coIndex, iloIndex, value) => {
        clearFieldError(`oo-items-${coIndex}-${iloIndex}`);
        setRows(prev => {
            const updated = prev.map((co, i) => {
                if (i !== coIndex) return co;
                const cleaned = value.replace(/[^0-9]/g, '');
                const newIlos = co.ilos.map((ilo, j) => {
                    if (j !== iloIndex) return { ...ilo };
                    return { ...ilo, items: cleaned === "" ? 0 : Math.min(Number(cleaned), 100) };
                });
                const newTotal = newIlos.reduce((sum, ilo) => sum + Number(ilo.items || 0), 0);
                return { ...co, ilos: newIlos, totalItems: newTotal };
            });
            return updated;
        });
    };

    // ── TOS validation ────────────────────────────────────────────────────────
    const validateTOS = () => {
        const issues = { outcomeOverview: [], assessmentMapping: [], tosSummary: [] };
        const fieldKeys = {};

        const counts = {};
        rows.forEach(co => {
            counts[co.co] = { ilos: {} };
            co.ilos.forEach(ilo => { counts[co.co].ilos[ilo.id] = 0; });
        });

        questions.forEach(q => {
            if (q.co && q.ilo) {
                if (counts[q.co]) counts[q.co].ilos[q.ilo] += (q.span || 1);
            }
        });

        const ooSet = new Set();
        rows.forEach((co, coIndex) => {
            if (Number(co.totalItems) > 100 || Number(co.totalItems) === 0) {
                fieldKeys[`oo-totalItems-${coIndex}`] = true;
            }
            co.ilos.forEach((ilo, iloIndex) => {
                if (Number(ilo.items) === 0) {
                    ooSet.add('Some ILOs have zero items');
                    fieldKeys[`oo-items-${coIndex}-${iloIndex}`] = true;
                } else if (Number(ilo.items) > 100) {
                    ooSet.add('Some ILOs exceed the maximum of 100 items');
                    fieldKeys[`oo-items-${coIndex}-${iloIndex}`] = true;
                }
            });
        });
        issues.outcomeOverview = [...ooSet];

        const mapSet = new Set();
        const hasMappingIssues = () => mapSet.size > 0;
        questions.forEach((q) => {
            if (!(q.question || q.rubricItem || '').trim()) mapSet.add('Some items have no instruction text');
            if (!q.co) { mapSet.add('Some items have no CO selected'); fieldKeys[`map-co-${q.id}`] = true; }
            if (!q.ilo) { mapSet.add('Some items have no ILO selected'); fieldKeys[`map-ilo-${q.id}`] = true; }
            if (!q.points) mapSet.add('Some items have no points');
            if (!q.cognitiveLevel) { mapSet.add('Some items have no cognitive level selected'); fieldKeys[`map-cognitiveLevel-${q.id}`] = true; }
        });
        // Only show allocation mismatch if there are no other mapping issues (redundancy guard)
        let hasAllocMismatch = false;
        rows.forEach(co => {
            co.ilos.forEach(ilo => {
                const required = ilo.items;
                const actual = counts[co.co].ilos[ilo.id];
                if (actual !== required) hasAllocMismatch = true;
            });
        });
        if (hasAllocMismatch && !hasMappingIssues()) mapSet.add('Item allocation does not match the required distribution');
        issues.assessmentMapping = [...mapSet];

        return { errors: issues, fieldKeys };
    };

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value });
    };

    const [isLoading, setIsLoading] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);
    const [builderLoading, setBuilderLoading] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const [builderFilledCount, setBuilderFilledCount] = useState(0);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [builderKey, setBuilderKey] = useState(0);
    const builderSaveRef = useRef(null);

    const handleBuilderSave = (savedItems) => {
        setQuestions(savedItems);
        setShowBuilder(false);
        setBuilderFilledCount(0);
    };

    const handleBuilderProgress = (filled) => {
        setBuilderFilledCount(filled);
    };

    const handleClearAll = () => {
        setQuestions(prev => prev.map(q => ({
            ...q,
            question: '',
            rubricItem: '',
            choices: [],
            rubricRows: [],
            points: String(q.span || 1),
            co: '',
            ilo: '',
            cognitiveLevel: '',
        })));
        setBuilderKey(prev => prev + 1);
        setShowClearConfirm(false);
    };

    const handleBuilderExport = () => {
        const data = JSON.stringify(questions.map(it => ({
            item: it.question, span: it.span, points: it.points,
            choices: (it.choices || []).map(c => c.text), rubric: it.rubricRows,
        })), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'assessment-items.json'; a.click();
        URL.revokeObjectURL(url);
    };

    const totalBuilderSlots = questions.reduce((s, q) => s + (q.span || 1), 0);
    const totalRequired = rows.reduce((s, co) => s + Number(co.totalItems || 0), 0);
    const filledCount = showBuilder ? builderFilledCount : questions.reduce((s, q) => {
        const hasContent = (q.question || q.rubricItem) && (q.question || q.rubricItem).trim().length > 0;
        return s + (hasContent ? (q.span || 1) : 0);
    }, 0);
    const allFilled = filledCount === totalRequired;
    const allItemsHavePoints = questions.every(q => q.points && Number(q.points) > 0);
    const canSubmit = allFilled && allItemsHavePoints && questions.length > 0;

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => { setIsLoading(false); }, 500);
        return () => clearTimeout(timer);
    }, [selectedSection]);

    const prevShowBuilder = useRef(showBuilder);
    useEffect(() => {
        const entering = !prevShowBuilder.current && showBuilder;
        prevShowBuilder.current = showBuilder;
        if (!entering) return;
        setBuilderLoading(true);
        const timer = setTimeout(() => setBuilderLoading(false), 400);
        return () => clearTimeout(timer);
    }, [showBuilder]);

    const handleNavigateBack = () => {
        setNavigating(true);
        if (courseCode) {
            const outcomesPayload = rows.map(r => ({
                co: r.co,
                description: r.description || '',
                totalItems: r.totalItems || 0,
                ilos: (r.ilos || []).map(ilo => ({
                    description: ilo.description || '',
                    hours: ilo.hours || 0,
                    percentage: ilo.percentage || 0,
                    items: ilo.items || 0
                }))
            }));
            saveOutcomes(courseCode, outcomesPayload).catch(() => {});
            saveItems(courseCode, questions).catch(() => {});
        }
        setTimeout(() => navigate('/assignedtos'), 400);
    };

    return (
        <>
            <div className={styles.container}>
                {showBuilder ? (
                    <BuilderNavigation
                        onSave={() => builderSaveRef.current && builderSaveRef.current()}
                        onExport={handleBuilderExport}
                        onClearAll={() => setShowClearConfirm(true)}
                        filledCount={filledCount}
                        totalSlots={totalRequired}
                        allFilled={allFilled}
                        tosStatus={tosStatus}
                    />
                ) : (
                    <div className={styles.navi}>
                        <div className={styles.return} onClick={handleNavigateBack}>
                            <ChevronLeft size={22}/>
                        </div>

                        <div className={styles['section-select']}>
                            <select value={selectedSection} onChange={handleSectionChange}>
                                <option value="Outcome Overview">Outcome Overview</option>
                                <option value="Assessment Item-Cognitive Level Alignment">Assessment Item-Cognitive Level Alignment</option>
                                <option value="TOS Summary">TOS Summary</option>
                            </select>
                        </div>

                        <div className={styles.draft} onClick={handleNavigateBack}>
                            Save as Draft
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                className={`${styles.submit} ${!canSubmit ? styles.submitDisabled : ''}`}
                                disabled={!canSubmit}
                                onClick={() => {
                                    const { errors, fieldKeys } = validateTOS();
                                    setErrorFields(fieldKeys);
                                    const hasErrors = errors.outcomeOverview.length > 0 || errors.assessmentMapping.length > 0 || errors.tosSummary.length > 0;
                                    if (hasErrors) {
                                        setExportErrors(errors);
                                        setShowExportErrorModal(true);
                                    } else {
                                        setIsPreviewOpen(true);
                                    }
                                }}
                            >
                                Submit
                            </button>
                            <span className={styles.submitTooltip}>Disabled due to incomplete assessment items</span>
                        </div>
                    </div>
                )}

                <div className={styles['dynamic-sections']} style={{ position: 'relative' }}>
                    {(builderLoading || navigating) && (
                        <div className={styles.loadingContainer} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(255,255,255,0.8)' }}>
                            <div className={styles.spinner}></div>
                        </div>
                    )}
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : (
                        <>
                            {selectedSection === 'Outcome Overview' &&
                                <section>
                                    <table className={`${layout.table} ${layout.TOSTable}`}>
                                        <thead>
                                        <tr>
                                            <th>ILOs</th>
                                            <th>DESCRIPTION</th>
                                            <th>NO. OF HOURS</th>
                                            <th>%</th>
                                            <th>NO. OF ITEMS</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {rows.map((co, coIndex) => (
                                            <React.Fragment key={co.co}>
                                                <tr>
                                                    <td>
                                                        <div className={`${layout.cellBox} ${layout.blankCell}`}>
                                                            {co.co}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={layout.blankCell}></div>
                                                    </td>
                                                    <td>
                                                        <div className={`${layout.cellBox} ${layout.blankCell}`}>
                                                            {co.totalHours}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={`${layout.cellBox} ${layout.blankCell}`}>
                                                            {co.totalPercentage}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={layout.cellBox}>
                                                            <input
                                                                className={`${layout.totalCoPoint} ${layout.input} ${errorFields[`oo-totalItems-${coIndex}`] ? layout.inputError : ''}`}
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={co.totalItems}
                                                                onChange={(e) => handleTotalItemsChange(coIndex, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>

                                                {co.ilos.map((ilo, iloIndex) => (
                                                    <tr key={`${co.co}-${ilo.id}`}>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.mutedBold}`}>
                                                                {ilo.id}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.readable}`}>
                                                                {ilo.description}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.muted}`}>
                                                                {ilo.hours}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.muted}`}>
                                                                {ilo.percentage}
                                                            </div>
                                                        </td>
                                                    <td>
                                                        <div className={layout.cellBox}>
                                                            <input
                                                                className={`${layout.point} ${layout.input} ${errorFields[`oo-items-${coIndex}-${iloIndex}`] ? layout.inputError : ''}`}
                                                                type="text"
                                                                inputMode="numeric"
                                                                value={ilo.items}
                                                                onChange={(e) => handleItemsChange(coIndex, iloIndex, e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                                                        e.preventDefault();
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    </tr>
                                                ))}

                                                {coIndex < rows.length - 1 && (
                                                    <tr key={`${co.co}-spacer`} style={{height: '16px'}} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                        </tbody>
                                    </table>
                                </section>
                            }

                            {selectedSection === 'Assessment Item-Cognitive Level Alignment' && (
                                <section>
                                    <QuestionCognitiveMapping
                                        key={builderKey}
                                        outcomeData={rows}
                                        questions={questions}
                                        setQuestions={setQuestions}
                                        assessmentMode={assessmentMode}
                                        rubricCategories={rubricCategories}
                                        setRubricCategories={setRubricCategories}
                                        showBuilder={showBuilder}
                                        onShowBuilderChange={setShowBuilder}
                                        builderSaveRef={builderSaveRef}
                                        onProgressUpdate={handleBuilderProgress}
                                        errorFields={errorFields}
                                        clearFieldError={clearFieldError}
                                        courseCode={courseCode}
                                    />
                                </section>
                            )}

                            {selectedSection === 'TOS Summary' &&
                                <section>
                                    <TOSSummary outcomeData={rows} questions={questions} />
                                </section>
                            }
                        </>
                    )}
                </div>
            </div>

            <TOSPreview
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                outcomeData={rows}
                questions={questions}
                courseName={courseName}
                courseCode={courseCode}
            />

            {showExportErrorModal && (
                <div className={layout.modalOverlay}>
                    <div className={layout.modal}>
                        <div className={layout.modalHeader}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>Export Validation Errors</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: '#999' }} onClick={() => setShowExportErrorModal(false)}>×</span>
                        </div>
                        <div className={layout.modalBody} style={{ textAlign: 'left' }}>
                            <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>Please fix the following before exporting:</p>
                            {exportErrors.outcomeOverview.length > 0 && (
                                <div className={layout.errorBlock}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1A1A1A', marginBottom: 6 }}>Outcome Overview</div>
                                    {exportErrors.outcomeOverview.map((e, i) => <div key={i} style={{ fontSize: '0.8rem', color: '#555', padding: '2px 0' }}>• {e}</div>)}
                                </div>
                            )}
                            {exportErrors.assessmentMapping.length > 0 && (
                                <div className={layout.errorBlock}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1A1A1A', marginBottom: 6 }}>Assessment Alignment</div>
                                    {exportErrors.assessmentMapping.map((e, i) => <div key={i} style={{ fontSize: '0.8rem', color: '#555', padding: '2px 0' }}>• {e}</div>)}
                                </div>
                            )}
                            {exportErrors.tosSummary.length > 0 && (
                                <div className={layout.errorBlock}>
                                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1A1A1A', marginBottom: 6 }}>TOS Summary</div>
                                    {exportErrors.tosSummary.map((e, i) => <div key={i} style={{ fontSize: '0.8rem', color: '#555', padding: '2px 0' }}>• {e}</div>)}
                                </div>
                            )}
                        </div>
                        <div className={layout.modalActions}>
                            <button
                                className={layout.confirmBtn}
                                style={{ backgroundColor: "#1A1A1A" }}
                                onMouseEnter={e => e.target.style.backgroundColor = '#444'}
                                onMouseLeave={e => e.target.style.backgroundColor = '#1A1A1A'}
                                onClick={() => setShowExportErrorModal(false)}
                            >
                                Okay, I'll fix it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showClearConfirm && (
                <div className={layout.modalOverlay}>
                    <div className={layout.modal}>
                        <div className={layout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Clear All Items</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => setShowClearConfirm(false)}>×</span>
                        </div>
                        <div className={layout.modalBody}>
                            <p style={{ color: "#555" }}>This will remove all content from every item. This action cannot be undone.</p>
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} style={{ background: "#f9f9f9", color: "#374151" }} onClick={() => setShowClearConfirm(false)}>Cancel</button>
                            <button className={layout.confirmBtn} style={{ background: "#1A1A1A" }} onMouseEnter={e => e.target.style.backgroundColor = '#444'} onMouseLeave={e => e.target.style.backgroundColor = '#1A1A1A'} onClick={handleClearAll}>
                                Yes, clear all
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default tosSections;