import SkeletonA from "../layouts/SkeletonA.jsx";
import HeaderA from "../components/HeaderA.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import {useNavigate, useParams} from "react-router-dom";
import TextField from "../components/TextField.jsx";
import TextArea from "../components/TextArea.jsx";
import SideNavigation from "../components/SideNavigation.jsx";
import {useEffect, useState, useRef, useMemo} from "react";
import {X, ChevronDown} from "react-feather";
import Duplicator from "../components/Duplicator.jsx";
import {getSyllabusByCode} from "../data/syllabiData.js";
import layout from "../styles/QuestionCognitiveMapping.module.sass";
import { AlertCircle, CheckCircle } from "react-feather";


const AssessmentForm = () => {
    const navigate = useNavigate();
    const goBackHandler = () => navigate(-1);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errors, setErrors] = useState({});
    const { code, assessmentId } = useParams();
    const syllabus = getSyllabusByCode(code);
    const assessmentData = syllabus?.assessments.find(a => a.id === assessmentId) || {};

    const validateForm = () => {
        let newErrors = {};

        if (!method.trim()) newErrors.method = "Assessment Method is required.";
        if (!description.trim()) newErrors.description = "Assessment Description is required.";

        if (rubric) {
            rubricRows.forEach((r, i) => {
                if (!r.criteria.trim()) newErrors[`criteria-${i}`] = `Criteria is required: Row ${i + 1}`;
                if (!r.maxScore || Number(r.maxScore) <= 0) newErrors[`score-${i}`] = `Max score must be greater than 0: Row ${i + 1}`;
            });
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Find which CO a TLA belongs to
    const getCOByTlaName = (syllabus, tlaName) => {
        if (!syllabus || !tlaName) return null;

        // 1. Find the topic of the TLA
        let topicTitle = null;

        for (const topic of syllabus.topics) {
            const found = topic.tlas?.find(t => t.tlaName === tlaName);
            if (found) {
                topicTitle = topic.title;
                break;
            }
        }

        if (!topicTitle) return null;

        // 2. Find which ILO contains that topic
        const ilo = syllabus.ilos.find(ilo =>
            ilo.topics.includes(topicTitle)
        );

        if (!ilo) return null;

        // ilo.id = "CO1-ILO2" → extract "CO1"
        return ilo.id.split("-")[0];
    };


// Get the 3 predefined methods for a TLA
    const getAssessmentSetForTla = (syllabus, tlaName) => {
        const co = getCOByTlaName(syllabus, tlaName);
        if (!co) return [];
        return syllabus.coAssessmentMethodSets[co] || [];
    };

    const rubricLibrary = useMemo(() => {
        const map = {}

        syllabus.assessments?.forEach(a => {
            if (a.assessmentMethod && a.rubrics?.length > 0) {
                map[a.assessmentMethod] = a.rubrics
            }
        })

        return map
    }, [syllabus])

    const [showRubricPicker, setShowRubricPicker] = useState(false)
    const [selectedRubricMethod, setSelectedRubricMethod] = useState("")

    let derivedTlaData = {
        topicTitle: null,
        tlaDescription: null
    };

    if (syllabus && syllabus.topics && assessmentData.tlaName) {
        // Iterate through all topics
        for (const topic of syllabus.topics) {
            if (topic.tlas) {
                // Check if this topic contains the TLA we are looking for
                const foundTLA = topic.tlas.find(t => t.tlaName === assessmentData.tlaName);

                if (foundTLA) {
                    derivedTlaData = {
                        topicTitle: topic.title,
                        tlaDescription: foundTLA.tlaDescription
                    };
                    break; // Stop loop once found
                }
            }
        }
    }

    const [method, setMethod] = useState(assessmentData.assessmentMethod || '');
    const [description, setDescription] = useState(assessmentData.assessmentDescription || '');
    const [rubric, setRubric] = useState(assessmentData.hasRubric || false);

    const createEmptyRubricRows = (count = 3) =>
        Array.from({ length: count }, () => ({
            id: Date.now() + Math.random(),
            criteria: '',
            maxScore: ''
        }))

    const [rubricRows, setRubricRows] = useState(
        assessmentData.rubrics && assessmentData.rubrics.length > 0
            ? assessmentData.rubrics
            : createEmptyRubricRows(3)
    );

    const handleRubricAdd = () => {
        const newRow = { id: Date.now() + Math.random(), criteria: '', maxScore: '', weight: '' };
        setRubricRows([...rubricRows, newRow]);
    };

    const handleRubricDelete = (id) => {
        if (rubricRows.length === 1) return;
        setRubricRows(rubricRows.filter(row => row.id !== id));
    };

    const handleRubricChange = (id, field, value) => {
        let updated = rubricRows.map(r =>
            r.id === id ? { ...r, [field]: value } : r
        )

        const total = updated.reduce((sum, r) => sum + Number(r.maxScore || 0), 0)

        if (total > 0) {
            updated = updated.map(r => {
                const raw = (Number(r.maxScore || 0) / total) * 100
                return {
                    ...r,
                    weight: formatPercent(raw)
                }
            })
        }

        setRubricRows(updated)
    }

    const predefinedSet = getAssessmentSetForTla(syllabus, assessmentData.tlaName);
    const assessmentOptions = predefinedSet.map(m => m.value);
    const dropdownRef = useRef(null);
    const [showOptions, setShowOptions] = useState(false);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!dropdownRef.current) return;
            if (!dropdownRef.current.contains(e.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, []);

    useEffect(() => {
        // If current method matches one of the predefined ones, fill description
        const found = predefinedSet.find(m => m.value === method);
        if (found) {
            setDescription(found.description);
        }
    }, [method]);

    const formatPercent = (num) => {
        if (!isFinite(num)) return ""
        return Number.isInteger(num) ? num : Number(num.toFixed(2))
    }

    const totalMaxScore = rubricRows.reduce(
        (sum, r) => sum + Number(r.maxScore || 0),
        0
    )

    const getWeight = score => {
        const allScoresFilled = rubricRows.every(r => r.maxScore !== "" && Number(r.maxScore) > 0);
        if (!allScoresFilled) return ""
        if (!totalMaxScore) return ""

        const raw = (Number(score) / totalMaxScore) * 100
        return Number.isInteger(raw) ? raw : raw.toFixed(2)
    }

    const handleConfirmSave = () => {
        console.log("Saving assessment:", {
            method,
            description,
            rubric,
            rubricRows
        });

        setShowConfirmModal(false);
        navigate(-1);
    };

    return (
        <SkeletonA
            header={<HeaderA role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation
                        goBack={goBackHandler}
                        onSave={() => {
                            if (validateForm()) {
                                setShowConfirmModal(true);
                            } else {
                                setShowErrorModal(true);
                            }
                        }}
                    />
                    <div className={styles['form-container']}>

                        <h2>Topic</h2>
                        <TextField
                            initialValue={derivedTlaData.topicTitle || 'No topic linked.'}
                            disabled={true}
                            readOnly={true}
                        />

                        <h2>TLA Details</h2>
                        <TextField
                            label={'TLA Name'}
                            disabled={true}
                            initialValue={assessmentData.tlaName || ''}
                            readOnly={true}
                        />
                        <TextArea
                            label={'TLA Description'}
                            disabled={true}
                            initialValue={derivedTlaData.tlaDescription || 'No description available.'}
                            readOnly={true}
                        />

                        <h2>Assessment Details</h2>
                        <div className={styles['tlas']}>
                            <div className={styles.assessmentField} ref={dropdownRef}>
                                <label>Assessment Method</label>

                                <div
                                    className={`${styles.assessmentDropdown} ${
                                        showOptions ? styles.open : ''
                                    }`}
                                    onClick={() => setShowOptions(v => !v)}
                                >
                                    <input
                                        value={method}
                                        onChange={e => {
                                            setMethod(e.target.value)
                                            setShowOptions(true)
                                        }}
                                        placeholder="Select or type"
                                    />

                                    <ChevronDown className={styles.dropdownArrow} size={16} />
                                </div>

                                {showOptions && (
                                    <div className={styles.assessmentOptions}>
                                        {assessmentOptions
                                            .filter(opt =>
                                                opt.toLowerCase().includes(method.toLowerCase())
                                            )
                                            .map(opt => (
                                                <div
                                                    key={opt}
                                                    className={styles.assessmentOption}
                                                    onMouseDown={() => {
                                                        setMethod(opt)
                                                        setShowOptions(false)
                                                    }}
                                                >
                                                    {opt}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                            <TextArea
                                label={'Assessment Description'}
                                initialValue={description}
                                onChange={(value) => setDescription(value)}
                            />
                            <div className={'checkbox'}>
                                <input
                                    type="checkbox"
                                    checked={rubric}
                                    onChange={() => setRubric(!rubric)}
                                />
                                Include Rubric
                            </div>
                        </div>

                        {rubric && (
                            <>
                                <div className={layout.rubricHeader}>
                                    <h2>Rubric Criteria</h2>

                                    <div className={layout.rubricTools}>
                                        {showRubricPicker && (
                                            <div className={layout.rubricDropdown}>
                                                <div className={layout.rubricSelectWrap}>
                                                    <select
                                                        value={selectedRubricMethod}
                                                        onChange={e => {
                                                            const method = e.target.value
                                                            setSelectedRubricMethod(method)

                                                            if (rubricLibrary[method]) {
                                                                setRubricRows(
                                                                    rubricLibrary[method].map(r => ({
                                                                        ...r,
                                                                        id: Date.now() + Math.random()
                                                                    }))
                                                                )
                                                            }
                                                        }}
                                                    >
                                                        <option value="" disabled hidden>
                                                            Select assessment method
                                                        </option>

                                                        {Object.keys(rubricLibrary).map(m => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className={layout.dropdownArrow} size={16} />
                                                </div>
                                            </div>
                                        )}

                                        {!showRubricPicker ? (
                                            <button
                                                className={layout.uploadButton}
                                                onClick={() => setShowRubricPicker(true)}
                                            >
                                                Use existing rubric
                                            </button>
                                        ) : (
                                            <button
                                                className={layout.clearRubricBtn}
                                                onClick={() => {
                                                    setShowRubricPicker(false)
                                                    setSelectedRubricMethod("")
                                                    setRubricRows(createEmptyRubricRows(3))   // clear applied rubric
                                                }}
                                            >
                                                <X className={layout.clearRubricIcon}/>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className={styles['rubrics']}>
                                    <div className={styles['rubric-header']}>
                                        <div className={styles['rubric-cell']}>Criteria</div>
                                        <div className={styles['rubric-cell']}>Max Score</div>
                                        <div className={styles['rubric-cell']}>Weight</div>
                                        <div className={styles['rubric-cell']}></div>
                                    </div>
                                    {rubricRows.map((row) => (
                                        <div key={row.id} className={styles['rubric-row']}>
                                            <TextField
                                                initialValue={row.criteria}
                                                onChange={(val) => handleRubricChange(row.id, 'criteria', val)}
                                            />
                                            <TextField
                                                initialValue={row.maxScore}
                                                onChange={(val) => handleRubricChange(row.id, 'maxScore', val)}
                                            />
                                            <TextField
                                                value={getWeight(row.maxScore)}
                                                disabled
                                                readOnly
                                            />
                                            <div onClick={() => handleRubricDelete(row.id)} className={styles['x']}>
                                                <X size={20} color={'white'}/>
                                            </div>
                                        </div>
                                    ))}
                                    <div className={styles['rubric-row']}>
                                        <TextField
                                            initialValue={'TOTAL'}
                                            disabled={true}
                                            readOnly={true}
                                        />
                                        <TextField
                                            initialValue={rubricRows.reduce((sum, r) => sum + Number(r.maxScore || 0), 0)}
                                            disabled={true}
                                            readOnly={true}
                                        />
                                        <TextField
                                            value={totalMaxScore ? "100%" : "0%"}
                                            disabled
                                            readOnly
                                        />
                                        <div className={styles['x']} style={{ visibility: 'hidden' }}>
                                            <X size={20} color={'transparent'} />
                                        </div>
                                    </div>
                                    <div className={styles['rubric-add']}>
                                        <Duplicator onAdd={handleRubricAdd} name={'Add Row'} />
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                    {showConfirmModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader}>
                                    <h3>Confirm Save</h3>
                                </div>
                                <div className={styles.modalBody}>
                                    <CheckCircle size={40} color="#4CAF50" style={{ marginBottom: "1rem" }} />
                                    <p>Are you sure you want to save this assessment?</p>
                                </div>
                                <div className={styles.modalActions}>
                                    <button className={styles.cancelBtn} onClick={() => setShowConfirmModal(false)}>
                                        No, Cancel
                                    </button>
                                    <button className={styles.confirmBtn} onClick={handleConfirmSave}>
                                        Yes, Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showErrorModal && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader} style={{ borderBottomColor: "#FF5252" }}>
                                    <h3 style={{ color: "#FF5252" }}>Validation Error</h3>
                                    <X size={24} className={styles.closeIcon} onClick={() => setShowErrorModal(false)} />
                                </div>
                                <div className={styles.modalBody}>
                                    <AlertCircle size={40} color="#FF5252" style={{ marginBottom: "1rem" }} />
                                    <p>Please fix the following issues before saving:</p>
                                    <ul className={styles.errorList}>
                                        {Object.values(errors).map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className={styles.modalActions}>
                                    <button
                                        className={styles.confirmBtn}
                                        style={{ backgroundColor: "#FF5252" }}
                                        onClick={() => setShowErrorModal(false)}
                                    >
                                        Okay, I’ll fix it
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            }
        />
    )
}

export default AssessmentForm;