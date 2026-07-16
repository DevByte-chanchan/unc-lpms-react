import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft} from 'react-feather';
import React, {useEffect, useState} from "react";
import {useNavigate, useSearchParams} from "react-router-dom";
import layout from "../styles/TosSections.module.sass";
import TOSPreview from "../pages/TosPreview.jsx";
import TOSSummary from "../pages/TosSummary.jsx";
import QuestionCognitiveMapping from "../pages/QuestionCognitiveMapping.jsx";

const tosSections = ({status}) => {

    const [questions, setQuestions] = useState([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [assessmentMode, setAssessmentMode] = useState(null);
    const [isAssessmentLoading, setIsAssessmentLoading] = useState(false);
    const [rubricCategories, setRubricCategories] = useState([]);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Outcome Overview';

    const courseOutlines = [
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
            description: "User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.",         totalHours: 12,
            totalPercentage: 100,
            totalItems: 30,
            ilos: [
                { id: "ILO1", description: "Apply Nielsen's 10 Usability Heuristics to critique existing interface designs.", hours: 3, percentage: 20, items: 6 },
                { id: "ILO2", description: "Create low-fidelity wireframes that solve specific user pain points.", hours: 3, percentage: 30, items: 9 },
                { id: "ILO3", description: "Apply Gestalt principles and color theory to enhance UI readability.", hours: 6, percentage: 50, items: 15 }
            ]
        }
    ];

    const [rows, setRows] = useState(courseOutlines);
    const [tosErrors, setTosErrors] = useState([]);
    const [showTosErrorModal, setShowTosErrorModal] = useState(false);

    const handleAssessmentModeSelect = (mode) => {
        setIsAssessmentLoading(true);

        setTimeout(() => {
            setAssessmentMode(mode);

            if (mode === "question") {
                setRubricCategories([]);
                setQuestions([]);
            }

            if (mode === "rubric") {
                setQuestions([]);
            }

            setIsAssessmentLoading(false);
        }, 600);
    };

    const getDistributedItems = (coIndex, totalItems) => {
        if (!totalItems || totalItems === "") return rows[coIndex].ilos.map(ilo => ilo.items);

        const total = Number(totalItems);
        const co = rows[coIndex];

        const calculated = co.ilos.map(ilo => {
            return Math.round((ilo.percentage / 100) * total);
        });

        const sum = calculated.reduce((acc, val) => acc + val, 0);
        const diff = total - sum;

        if (diff !== 0) {
            calculated[calculated.length - 1] += diff;
        }

        return calculated;
    };

    const handleItemsChange = (coIndex, iloIndex, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[coIndex].ilos[iloIndex].items = value === "" ? "" : Number(value);
            return updated;
        });
    };

    const handleTotalItemsChange = (coIndex, value) => {
        setRows(prev => {
            const updated = [...prev];
            updated[coIndex].totalItems = value === "" ? "" : Number(value);

            if (value !== "") {
                const distributedItems = getDistributedItems(coIndex, value);
                updated[coIndex].ilos.forEach((ilo, idx) => {
                    ilo.items = distributedItems[idx];
                });
            }

            return updated;
        });
    };

    const validateTOS = () => {
        const errors = [];

        const counts = {};
        rows.forEach(co => {
            counts[co.co] = { ilos: {} };
            co.ilos.forEach(ilo => {
                counts[co.co].ilos[ilo.id] = 0;
            });
        });

        questions.forEach(q => {
            if (q.co && q.ilo) {
                counts[q.co].ilos[q.ilo] += 1;
            }
        });

        rows.forEach(co => {
            co.ilos.forEach(ilo => {
                const required = ilo.items;
                const actual = counts[co.co].ilos[ilo.id];

                if (actual !== required) {
                    errors.push(
                        `${co.co}-${ilo.id}: requires ${required} items`
                    );
                }
            });
        });

        questions.forEach((q, i) => {
            const row = i + 1;

            if (assessmentMode === "question") {
                if (!q.question) errors.push(`Question is empty: Row ${row}`);
            }
            if (assessmentMode === "rubric") {
                if (!q.rubricItem) errors.push(`Rubric category missing: Row ${row}`);
            }

            if (!q.co) errors.push(`CO not selected: Row ${row}`);
            if (!q.ilo) errors.push(`ILO not selected: Row ${row}`);
            if (!q.points) errors.push(`Points missing: Row ${row}`);
            if (!q.cognitiveLevel) errors.push(`Cognitive level missing: Row ${row}`);
        });

        return errors;
    };

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value });
    };

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsLoading(true);

        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [selectedSection]);

    return (
        <>
            <div className={styles.container}>
                <div className={styles.navi}>
                    <div
                        className={styles.return}
                        onClick={() => navigate('/assignedtos')}
                    >
                        <ChevronLeft size={22}/>
                    </div>

                    <div className={styles['section-select']}>
                        <select value={selectedSection} onChange={handleSectionChange}>
                            <option value="Outcome Overview">Outcome Overview</option>
                            <option value="Assessment Item-Cognitive Level Alignment">Assessment Item-Cognitive Level Alignment</option>
                            <option value="TOS Summary">TOS Summary</option>
                        </select>
                    </div>

                    <div
                        className={styles.draft}
                        onClick={() => navigate('/assignedtos')}
                    >
                        Save as Draft
                    </div>

                    <div>
                        <button
                            className={styles.submit}
                            onClick={() => {
                                const errors = validateTOS();
                                if (errors.length > 0) {
                                    setTosErrors(errors);
                                    setShowTosErrorModal(true);
                                } else {
                                    setIsPreviewOpen(true);
                                }
                            }}
                        >
                            Export
                        </button>
                    </div>
                </div>

                <div className={styles['dynamic-sections']}>

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
                                    <>
                                        {/* CO Header Row */}
                                        <tr key={`${co.co}-header`}>
                                            <td>
                                                <div className={`${layout.cellBox} ${layout.blankCell}`}>
                                                    {co.co}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={layout.blankCell}>
                                                </div>
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
                                                        className={`${layout.totalCoPoint} ${layout.input}`}
                                                        type="number"
                                                        value={co.totalItems}
                                                        onChange={(e) => handleTotalItemsChange(coIndex, e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                        </tr>

                                        {/* ILO Rows */}
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
                                                            className={`${layout.point} ${layout.input}`}
                                                            type="number"
                                                            value={ilo.items}
                                                            onChange={(e) => handleItemsChange(coIndex, iloIndex, e.target.value)}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {coIndex < rows.length - 1 && (
                                            <tr key={`${co.co}-spacer`} style={{height: '16px'}}>
                                            </tr>
                                        )}
                                    </>
                                ))}
                                </tbody>
                            </table>
                        </section>
                    }
                        {selectedSection === 'Assessment Item-Cognitive Level Alignment' && (
                            <section>

                                {!assessmentMode && !isAssessmentLoading && (
                                    <div className={layout.modeOverlay}>
                                        <div className={layout.modeBox}>
                                            <h3>Select Assessment Type</h3>
                                            <p>What assessment will be mapped?</p>
                                            <div className={layout.modeButtons}>
                                                <button onClick={() => handleAssessmentModeSelect("question")}>
                                                    Question Bank
                                                </button>
                                                <button onClick={() => handleAssessmentModeSelect("rubric")}>
                                                    Rubric-Based
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isAssessmentLoading && (
                                    <div className={styles.loadingContainer}>
                                        <div className={styles.spinner}></div>
                                    </div>
                                )}

                                {assessmentMode && !isAssessmentLoading && (
                                    <QuestionCognitiveMapping
                                        outcomeData={rows}
                                        questions={questions}
                                        setQuestions={setQuestions}
                                        assessmentMode={assessmentMode}
                                        rubricCategories={rubricCategories}
                                        setRubricCategories={setRubricCategories}
                                    />
                                )}

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
            />

            {showTosErrorModal && (
                <div className={layout.modalOverlay}>
                    <div className={layout.modal}>
                        <div className={layout.modalHeader} style={{ borderBottomColor: "#FF5252" }}>
                            <h3 style={{ color: "#FF5252" }}>TOS Validation Errors</h3>
                            <span
                                style={{ cursor: "pointer", fontSize: "20px" }}
                                onClick={() => setShowTosErrorModal(false)}
                            >
          ×
        </span>
                        </div>

                        <div className={layout.modalBody}>
                            <p>Please fix the following before exporting:</p>
                            <ul
                                className={layout.errorList}
                                style={{
                                    listStyle: "none",
                                    paddingLeft: 20,
                                    margin: 0,
                                    textAlign: "left"
                                }}
                            >
                                {tosErrors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>

                        <div className={layout.modalActions}>
                            <button
                                className={layout.confirmBtn}
                                style={{
                                    backgroundColor: "#FF5252"
                                }}
                                onClick={() => setShowTosErrorModal(false)}
                            >
                                Okay, I’ll fix it
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    )
}

export default tosSections;