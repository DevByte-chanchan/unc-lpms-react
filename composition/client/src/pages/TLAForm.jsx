import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import TextField from "../components/TextField.jsx";
import Dropdown from "../components/Dropdown.jsx";
import TextArea from "../components/TextArea.jsx";
import { Plus, Award, X, Edit2 } from "react-feather";
import { fetchJson } from "../utils/api.js";
import { PERIODS, periodLabel, periodCode, parseWeight } from "../utils/assessmentWeights.js";
import { IED_LEVELS } from "../utils/iedLevels.js";

// 0 is an ungraded (practice) assessment; otherwise parseWeight (0 < w <= 100). Mirrors the server.
const weightOf = (value) => (/^\s*0+(\.0+)?\s*%?\s*$/.test(String(value ?? '')) ? 0 : parseWeight(value));
import styles from "../styles/Form.module.sass";
import tStyles from "../styles/TopicSelector.module.sass";

const ILO_LABEL_OF = (weekIlos) => (ilo) => `ILO ${weekIlos.indexOf(ilo) + 1}${ilo.iedLevel ? ` (${IED_LEVELS.find(level => level.code === ilo.iedLevel)?.name || ilo.iedLevel})` : ''}`;

const TLAForm = forwardRef(({ iloId, isOrientation = false, status, setUnresolvedCount, label }, ref) => {
    const ALL_PHASES = ['Asynchronous', 'Synchronous', 'Pre-class', 'In-class', 'Post-class'];

    const [isLoading, setIsLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [tlas, setTlas] = useState([]);
    const [newestCardId, setNewestCardId] = useState(null);
    const scrollContainerRef = useRef(null);

    const [reviewComments, setReviewComments] = useState([]);
    // The period this week falls in, the ILOs of its course outcome (a graded assessment names one),
    // and how much of each level's course-wide weight the other assessments already use.
    const [suggestedPeriod, setSuggestedPeriod] = useState('');
    const [weekIlos, setWeekIlos] = useState([]);
    const [levelWeights, setLevelWeights] = useState(null);
    const ILO_LABEL = ILO_LABEL_OF(weekIlos);

    const normalizeClassPhase = (val) => {
        if (!val) return '';
        const v = val.toString().toLowerCase();
        if (v.includes('pre')) return 'Pre-class';
        if (v.includes('in')) return 'In-class';
        if (v.includes('post')) return 'Post-class';
        if (v.includes('async')) return 'Asynchronous';
        if (v.includes('sync')) return 'Synchronous';
        return val;
    };

    const mapDbToUi = (tla) => {
        return {
            ...tla,
            assessmentPeriod: tla.assessmentPeriod || '',
            assessmentWeight: tla.assessmentWeight ?? '',
            assessmentIloId: tla.assessmentIloId ?? '',
            performedBy: tla.performedBy === 'T' ? 'Instructor' : tla.performedBy === 'S' ? 'Student' : tla.performedBy,
            classPhase: normalizeClassPhase(tla.classPhase),
            isLab: Boolean(tla.isLab || tla.is_lab || false)
        };
    };

    const mapUiToDb = (tla) => ({
        ...tla,
        performedBy: tla.performedBy === 'Instructor' ? 'T' : tla.performedBy === 'Student' ? 'S' : tla.performedBy
    });

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setIsLoading(true);
        setErrors({});

        const fetchTlaData = async () => {
            try {
                const orientParam = isOrientation ? 'true' : 'false';
                const tlaUrl = `/api/tlas/ilo/${iloId}?isOrientation=${orientParam}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/tlas`;

                const pData = fetchJson(tlaUrl).catch(() => ({}));
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);

                const [data, targetedComments] = await Promise.all([pData, pComments]);
                if (!mounted) return;

                const { tlas: existingTlas } = data || {};
                setSuggestedPeriod(data?.suggestedPeriod || '');
                setWeekIlos(Array.isArray(data?.ilos) ? data.ilos.filter(ilo => !ilo.isOrientation) : []);
                setLevelWeights(data?.levelWeights || null);

                const initialComments = (Array.isArray(targetedComments) ? targetedComments : []).map(c => ({
                    ...c,
                    resolved_status: c.resolved_status === 1 || c.resolved_status === true
                }));
                setReviewComments(initialComments);

                if (existingTlas && existingTlas.length > 0) {
                    const mappedTlas = existingTlas.map(mapDbToUi);
                    setTlas(mappedTlas);
                } else {
                    setTlas([{
                        id: Date.now(), classPhase: '', performedBy: '',
                        tlaName: '', tlaDescription: '', laboratory: false, isLab: false,
                        assessmentType: '', assessmentDetail: '', assessmentPeriod: '', assessmentWeight: '', assessmentIloId: ''
                    }]);
                }
            } catch (error) {
                console.error("Error fetching TLA data components:", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        fetchTlaData();
        return () => { mounted = false; };
    }, [iloId, isOrientation, status]);

    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
    }, [reviewComments, setUnresolvedCount]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTo({
                    top: scrollContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    };

    const handleTlaAdd = () => {
        const generatedId = Date.now() + Math.random();
        setNewestCardId(generatedId);
        setTlas([...tlas, {
            id: generatedId, classPhase: '', performedBy: '',
            tlaName: '', tlaDescription: '', laboratory: false, isLab: false,
            assessmentType: '', assessmentDetail: '', assessmentPeriod: '', assessmentWeight: '', assessmentIloId: ''
        }]);

        setTimeout(() => setNewestCardId(null), 1500);
        scrollToBottom();
    };

    const handleTlaDelete = (idToDelete) => {
        if (tlas.length === 1) return;
        setTlas(tlas.filter((item) => item.id !== idToDelete));
    };

    const handleTlaChange = (id, field, value) => {
        setTlas(prevTlas => prevTlas.map(tla => tla.id === id ? { ...tla, [field]: value } : tla));
        const errorKey = `tla_${id}_${field}`;
        if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: null }));
    };

    const validateForm = () => {
        let newErrors = {};
        tlas.forEach((tla) => {
            if (!tla.classPhase) newErrors[`tla_${tla.id}_classPhase`] = "Required";
            if (!tla.performedBy) newErrors[`tla_${tla.id}_performedBy`] = "Required";
            if (!tla.tlaName.trim()) newErrors[`tla_${tla.id}_tlaName`] = "TLA Name required";
            if (!tla.tlaDescription.trim()) newErrors[`tla_${tla.id}_tlaDescription`] = "Description required";

            const hasAssessment = Boolean(tla.assessmentType || tla.assessmentDetail);
            if (hasAssessment) {
                if (!tla.assessmentType.trim()) newErrors[`tla_${tla.id}_assessmentType`] = "Required";
                if (!tla.assessmentDetail.trim()) newErrors[`tla_${tla.id}_assessmentDetail`] = "Detail required";
                if (!tla.assessmentPeriod) newErrors[`tla_${tla.id}_assessmentPeriod`] = "Choose a period";
                const weight = weightOf(tla.assessmentWeight);
                if (weight === null) newErrors[`tla_${tla.id}_assessmentWeight`] = "Enter a weight from 0 to 100";
                if (weight > 0 && weekIlos.length > 1 && !tla.assessmentIloId) newErrors[`tla_${tla.id}_assessmentIloId`] = "Choose the ILO it assesses";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 ? null : "TLAs contain missing required fields.";
    };

    useImperativeHandle(ref, () => ({
        validate: validateForm,
        getComments: () => reviewComments,
        toggleComment: (commentId) => {
            setReviewComments(prev => prev.map(c =>
                c.comment_id === commentId ? { ...c, resolved_status: !c.resolved_status } : c
            ));
        },
        save: async () => {
            if (status === 'returned' && reviewComments.length > 0) {
                const commentPayload = reviewComments.map(c => ({
                    comment_id: c.comment_id,
                    resolved_status: c.resolved_status ? 1 : 0
                }));

                await fetchJson(`/api/comments/update-resolution`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ updates: commentPayload })
                });
            }

            const payloadTlas = tlas.map(mapUiToDb);
            await fetchJson(`/api/tlas/ilo/${iloId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    week_id: Number(iloId),
                    is_orientation: Boolean(isOrientation),
                    tlas: payloadTlas
                })
            });
        },
        getCommentTargetLabel: (comment) => {
            if (comment.target_title) return comment.target_title;
            const match = tlas.find(t => Number(t.id) === Number(comment.target_id) || Number(t.tla_id) === Number(comment.target_id));
            return match ? (match.tlaName || match.tla_name) : `TLA Element ID: ${comment.target_id}`;
        }
    }));

    if (isLoading) return <div className={styles.emptyChecklist}>Loading TLA Configurations...</div>;

    const emptySpots = Math.max(4, tlas.length + (tlas.length % 2 === 1 ? 1 : 0)) - tlas.length;
    const placeholderCards = Array.from({ length: emptySpots }).map((_, i) => (
        <div key={`placeholder-${i}`} className={`${tStyles.placeholderCard} ${styles.tlaPlaceholderScale}`}>
            <div className={tStyles.placeholderHeader} />
            <div className={tStyles.placeholderBody} style={{ padding: '20px' }}>
                <div className={tStyles.placeholderLine} style={{ height: '38px', marginBottom: '8px' }} />
                <div className={tStyles.placeholderLine} style={{ height: '38px', marginBottom: '8px' }} />
                <div className={tStyles.placeholderLine} style={{ height: '90px' }} />
            </div>
        </div>
    ));

    return (
        <div className={tStyles.container} style={{ display: "flex", flexDirection: "column", height: "100%", flexGrow: 1, minHeight: 0 }}>
            {label && <label className={tStyles.label}>{label}</label>}

            <div className={tStyles.mainWrapper}>
                <div className={tStyles.stickyHeader}>
                    <div className={tStyles.headerRow} style={{ justifyContent: 'flex-end' }}>
                        <button className={tStyles.mainAddBtn} onClick={handleTlaAdd}>
                            <Plus size={16} className={tStyles.btnIcon} /> <span>Add TLA</span>
                        </button>
                    </div>
                </div>

                <div className={tStyles.scrollContainer} ref={scrollContainerRef}>
                    <div className={tStyles.configArea}>
                        {tlas.map((item) => {
                            const isNewlyAdded = item.id === newestCardId;
                            const hasAssessmentData = Boolean(item.assessmentType || item.assessmentDetail);

                            return (
                                <div key={item.id} className={`${styles.tlaCardCopycat} ${isNewlyAdded ? tStyles.newEntry : ''}`}>
                                    <div className={tStyles.topicHeaderCard}>
                                        <div className={tStyles.topicTitleGroup}>
                                            <div className={`${styles.tlaLabDot} ${item.isLab ? styles.activeLabDot : ''}`} title={item.isLab ? "Laboratory" : "Standard"} />
                                            <div className={tStyles.inputWrapper}>
                                                <Edit2 size={12} className={tStyles.editIcon} />
                                                <input
                                                    className={tStyles.topicTitleInput}
                                                    value={item.tlaName}
                                                    onChange={(e) => handleTlaChange(item.id, 'tlaName', e.target.value)}
                                                    placeholder="Enter TLA Name..."
                                                />
                                            </div>
                                        </div>
                                        {tlas.length > 1 && (
                                            <button className={tStyles.removeTopicBtn} onClick={() => handleTlaDelete(item.id)}>
                                                <X color={"white"} size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <div className={styles.tlaBodyCopycat}>

                                        <div className={styles.fieldsGridTwo}>
                                            <div className={styles.tlaFieldSubtopicStyle}>
                                                <Dropdown
                                                    options={['Student', 'Instructor']}
                                                    label={'Performed By'}
                                                    value={item.performedBy}
                                                    onChange={(val) => handleTlaChange(item.id, 'performedBy', val)}
                                                    error={errors[`tla_${item.id}_performedBy`]}
                                                />
                                            </div>
                                            <div className={styles.tlaFieldSubtopicStyle}>
                                                <Dropdown
                                                    options={ALL_PHASES}
                                                    label={'Class Phase'}
                                                    value={item.classPhase}
                                                    onChange={(val) => handleTlaChange(item.id, 'classPhase', val)}
                                                    error={errors[`tla_${item.id}_classPhase`]}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.fieldsGridOne}>
                                            <div className={styles.tlaFieldSubtopicStyle}>
                                                <div className="generic-field-container">
                                                    <div className="generic-field-label" style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, color: '#4A5568' }}>Setting Focus</div>
                                                    <div className={`${styles.labCheckboxWrapper} ${item.isLab ? styles.isLabActive : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            id={`lab_check_${item.id}`}
                                                            checked={item.isLab}
                                                            onChange={(e) => handleTlaChange(item.id, 'isLab', e.target.checked)}
                                                            className={styles.labCheckboxInput}
                                                        />
                                                        <label htmlFor={`lab_check_${item.id}`} className={`${styles.labCheckboxLabel} ${item.isLab ? styles.isLabActiveLabel : ''}`}>
                                                            Laboratory Activity
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`${styles.tlaFieldSubtopicStyle} ${styles.tlaDescriptionHigh}`}>
                                            <TextArea
                                                label={'TLA Description'}
                                                value={item.tlaDescription}
                                                onChange={(val) => handleTlaChange(item.id, 'tlaDescription', val)}
                                                error={errors[`tla_${item.id}_tlaDescription`]}
                                                rows={5}
                                                placeholder="Describe the activity..."
                                            />
                                        </div>

                                        <div className={styles.tlaAssessmentSection}>
                                            <div className={`${styles.assessmentCopycatBox} ${hasAssessmentData ? styles.filledAssessment : styles.emptyAssessment}`}>
                                                <div className={styles.assessmentBoxHeader}>
                                                    <div className={`${styles.assessmentBoxTitle} ${hasAssessmentData ? styles.filledAssessmentTitle : ''}`}>
                                                        <Award size={14} /><span>Assessment</span>
                                                    </div>
                                                    {hasAssessmentData && (
                                                        <button type="button" onClick={() => {
                                                            handleTlaChange(item.id, 'assessmentType', '');
                                                            handleTlaChange(item.id, 'assessmentDetail', '');
                                                            handleTlaChange(item.id, 'assessmentPeriod', '');
                                                            handleTlaChange(item.id, 'assessmentWeight', '');
                                                            handleTlaChange(item.id, 'assessmentIloId', '');
                                                        }} className={styles.removeAssessmentBtn}>
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className={styles.fieldsGridTwo}>
                                                    <div className={styles.tlaFieldSubtopicStyle}>
                                                        <TextField
                                                            label={'Type'}
                                                            value={item.assessmentType}
                                                            onChange={(val) => {
                                                                handleTlaChange(item.id, 'assessmentType', val);
                                                                if (!item.assessmentPeriod && suggestedPeriod) handleTlaChange(item.id, 'assessmentPeriod', suggestedPeriod);
                                                            }}
                                                            placeholder="e.g. Case Study"
                                                        />
                                                    </div>
                                                    <div className={styles.tlaFieldSubtopicStyle}>
                                                        <TextField
                                                            label={'Detail'}
                                                            value={item.assessmentDetail}
                                                            onChange={(val) => handleTlaChange(item.id, 'assessmentDetail', val)}
                                                            placeholder="e.g. 50% Group Rubrics"
                                                        />
                                                    </div>
                                                </div>
                                                {hasAssessmentData && (
                                                    <>
                                                        <div className={styles.fieldsGridTwo}>
                                                            <div className={styles.tlaFieldSubtopicStyle}>
                                                                <Dropdown
                                                                    label={'Period'}
                                                                    options={PERIODS.map(period => period.label)}
                                                                    value={periodLabel(item.assessmentPeriod)}
                                                                    onChange={(label) => handleTlaChange(item.id, 'assessmentPeriod', periodCode(label))}
                                                                    error={errors[`tla_${item.id}_assessmentPeriod`]}
                                                                />
                                                            </div>
                                                            <div className={styles.tlaFieldSubtopicStyle}>
                                                                <TextField
                                                                    label={'Weight (% of the whole course; 0 = practice)'}
                                                                    value={item.assessmentWeight}
                                                                    onChange={(val) => handleTlaChange(item.id, 'assessmentWeight', val)}
                                                                    error={errors[`tla_${item.id}_assessmentWeight`]}
                                                                    placeholder="e.g., 12.5"
                                                                />
                                                            </div>
                                                        </div>
                                                        {weekIlos.length > 0 && (
                                                            <div className={styles.tlaFieldSubtopicStyle}>
                                                                <Dropdown
                                                                    label={'ILO assessed'}
                                                                    options={weekIlos.map(ILO_LABEL)}
                                                                    value={(() => { const ilo = weekIlos.find(x => Number(x.id) === Number(item.assessmentIloId)); return ilo ? ILO_LABEL(ilo) : ''; })()}
                                                                    onChange={(label) => {
                                                                        const ilo = weekIlos.find(x => ILO_LABEL(x) === label);
                                                                        handleTlaChange(item.id, 'assessmentIloId', ilo ? ilo.id : '');
                                                                    }}
                                                                    error={errors[`tla_${item.id}_assessmentIloId`]}
                                                                />
                                                            </div>
                                                        )}
                                                        {(() => {
                                                            const ilo = weekIlos.find(x => Number(x.id) === Number(item.assessmentIloId)) || (weekIlos.length === 1 ? weekIlos[0] : null);
                                                            const budget = ilo?.iedLevel && levelWeights ? levelWeights[ilo.iedLevel] : null;
                                                            if (!budget) return null;
                                                            return (
                                                                <p className={styles.assessmentHint}>
                                                                    {IED_LEVELS.find(level => level.code === budget.level)?.name} assessments must total {budget.target}% of the course;
                                                                    the assessments outside this week use {budget.usedElsewhere}%.
                                                                </p>
                                                            );
                                                        })()}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {placeholderCards}
                    </div>
                </div>
            </div>
            {Object.keys(errors).length > 0 && <div className={tStyles.errorText}>Please complete required fields.</div>}
        </div>
    );
});

export default TLAForm;
