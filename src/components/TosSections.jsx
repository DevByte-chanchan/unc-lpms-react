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
    const [assessmentMode] = useState("question");
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

    const [rows, setRows] = useState(courseOutlines);
    const [tosErrors, setTosErrors] = useState([]);
    const [showTosErrorModal, setShowTosErrorModal] = useState(false);

    // ── Outcome Overview helpers ──────────────────────────────────────────────

    // When total CO items changes → redistribute to ILOs by percentage
    const handleTotalItemsChange = (coIndex, value) => {
        setRows(prev => {
            const updated = prev.map((co, i) => {
                if (i !== coIndex) return co;
                const cleaned = value.replace(/[^0-9]/g, '');
                const total = cleaned === "" ? "" : Number(cleaned);
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
        setRows(prev => {
            const updated = prev.map((co, i) => {
                if (i !== coIndex) return co;
                const cleaned = value.replace(/[^0-9]/g, '');
                const newIlos = co.ilos.map((ilo, j) => {
                    if (j !== iloIndex) return { ...ilo };
                    return { ...ilo, items: cleaned === "" ? "" : Number(cleaned) };
                });
                const newTotal = newIlos.reduce((sum, ilo) => sum + Number(ilo.items || 0), 0);
                return { ...co, ilos: newIlos, totalItems: newTotal };
            });
            return updated;
        });
    };

    // ── TOS validation ────────────────────────────────────────────────────────
    const validateTOS = () => {
        const errors = [];

        const counts = {};
        rows.forEach(co => {
            counts[co.co] = { ilos: {} };
            co.ilos.forEach(ilo => { counts[co.co].ilos[ilo.id] = 0; });
        });

        questions.forEach(q => {
            if (q.co && q.ilo) {
                counts[q.co].ilos[q.ilo] += (q.span || 1);
            }
        });

        rows.forEach(co => {
            co.ilos.forEach(ilo => {
                const required = ilo.items;
                const actual = counts[co.co].ilos[ilo.id];
                if (actual !== required) {
                    errors.push(`${co.co}-${ilo.id}: requires ${required} item(s), currently has ${actual}`);
                }
            });
        });

        questions.forEach((q, i) => {
            const row = i + 1;
            if (!q.question && !q.rubricItem) errors.push(`Item text is empty: Row ${row}`);
            if (!q.co)             errors.push(`CO not selected: Row ${row}`);
            if (!q.ilo)            errors.push(`ILO not selected: Row ${row}`);
            if (!q.points)         errors.push(`Points missing: Row ${row}`);
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
        const timer = setTimeout(() => { setIsLoading(false); }, 500);
        return () => clearTimeout(timer);
    }, [selectedSection]);

    return (
        <>
            <div className={styles.container}>
                <div className={styles.navi}>
                    <div className={styles.return} onClick={() => navigate('/assignedtos')}>
                        <ChevronLeft size={22}/>
                    </div>

                    <div className={styles['section-select']}>
                        <select value={selectedSection} onChange={handleSectionChange}>
                            <option value="Outcome Overview">Outcome Overview</option>
                            <option value="Assessment Item-Cognitive Level Alignment">Assessment Item-Cognitive Level Alignment</option>
                            <option value="TOS Summary">TOS Summary</option>
                        </select>
                    </div>

                    <div className={styles.draft} onClick={() => navigate('/assignedtos')}>
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
                                                                className={`${layout.totalCoPoint} ${layout.input}`}
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
                                                                className={`${layout.point} ${layout.input}`}
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
                                        outcomeData={rows}
                                        questions={questions}
                                        setQuestions={setQuestions}
                                        assessmentMode={assessmentMode}
                                        rubricCategories={rubricCategories}
                                        setRubricCategories={setRubricCategories}
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
            />

            {showTosErrorModal && (
                <div className={layout.modalOverlay}>
                    <div className={layout.modal}>
                        <div className={layout.modalHeader} style={{ borderBottomColor: "#FF5252" }}>
                            <h3 style={{ color: "#FF5252" }}>TOS Validation Errors</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px" }} onClick={() => setShowTosErrorModal(false)}>×</span>
                        </div>
                        <div className={layout.modalBody}>
                            <p>Please fix the following before exporting:</p>
                            <ul className={layout.errorList} style={{ listStyle: "none", paddingLeft: 20, margin: 0, textAlign: "left" }}>
                                {tosErrors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        </div>
                        <div className={layout.modalActions}>
                            <button
                                className={layout.confirmBtn}
                                style={{ backgroundColor: "#FF5252" }}
                                onClick={() => setShowTosErrorModal(false)}
                            >
                                Okay, I'll fix it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default tosSections;