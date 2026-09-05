import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import TextField from "../components/TextField.jsx";
import Dropdown from "../components/Dropdown.jsx";
import DropdownMultiSelect from "../components/DropdownMultiSelect.jsx";
import TextArea from "../components/TextArea.jsx";
import { Plus, Award, Trash2, X, Edit2 } from "react-feather";
import { fetchJson } from "../utils/api.js";
import styles from "../styles/Form.module.sass"; 
import tStyles from "../styles/TopicSelector.module.sass"; 

const TLAForm = forwardRef(({ iloId, status, setUnresolvedCount, label }, ref) => {
    const ALL_PHASES = ['Asynchronous', 'Synchronous', 'Pre-class', 'In-class', 'Post-class'];

    const [isLoading, setIsLoading] = useState(true);
    const [availableTopics, setAvailableTopics] = useState([]);
    const [topicIdMap, setTopicIdMap] = useState({});
    const [errors, setErrors] = useState({});
    const [tlas, setTlas] = useState([]);
    const [newestCardId, setNewestCardId] = useState(null);
    const scrollContainerRef = useRef(null);

    const [reviewComments, setReviewComments] = useState([]);

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
            selectedTopics: Array.isArray(tla.selectedTopics) ? tla.selectedTopics : (tla.selectedTopics ? [tla.selectedTopics] : []),
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
        const fetchTlaData = async () => {
            try {
                const tlaUrl = `/api/tlas/ilo/${iloId}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/tlas`;

                const pData = fetchJson(tlaUrl).catch(() => ({}));
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);

                const [data, targetedComments] = await Promise.all([pData, pComments]);
                const { availableTopics, topicIdMap, tlas: existingTlas } = data;

                setAvailableTopics(availableTopics || []);
                setTopicIdMap(topicIdMap || {});

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
                        id: Date.now(), selectedTopics: [], classPhase: '', performedBy: '',
                        tlaName: '', tlaDescription: '', laboratory: false, isLab: false,
                        assessmentType: '', assessmentDetail: ''
                    }]);
                }
            } catch (error) {
                console.error("Error fetching TLA data components:", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (iloId) fetchTlaData();
    }, [iloId, status]);

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
            id: generatedId, selectedTopics: [], classPhase: '', performedBy: '',
            tlaName: '', tlaDescription: '', laboratory: false, isLab: false,
            assessmentType: '', assessmentDetail: ''
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
            if (!tla.selectedTopics || tla.selectedTopics.length === 0) newErrors[`tla_${tla.id}_selectedTopics`] = "Required";
            if (!tla.classPhase) newErrors[`tla_${tla.id}_classPhase`] = "Required";
            if (!tla.performedBy) newErrors[`tla_${tla.id}_performedBy`] = "Required";
            if (!tla.tlaName.trim()) newErrors[`tla_${tla.id}_tlaName`] = "TLA Name required";
            if (!tla.tlaDescription.trim()) newErrors[`tla_${tla.id}_tlaDescription`] = "Description required";

            const hasAssessment = Boolean(tla.assessmentType || tla.assessmentDetail);
            if (hasAssessment) {
                if (!tla.assessmentType.trim()) newErrors[`tla_${tla.id}_assessmentType`] = "Required";
                if (!tla.assessmentDetail.trim()) newErrors[`tla_${tla.id}_assessmentDetail`] = "Detail required";
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
            const payloadTlas = tlas.map(mapUiToDb);
            await fetchJson(`/api/tlas/ilo/${iloId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tlas: payloadTlas, topicIdMap })
            });
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
                                        
                                        <div className={styles.tlaFieldSubtopicStyle}>
                                            <DropdownMultiSelect
                                                options={availableTopics}
                                                label={'Topic Title(s)'}
                                                value={item.selectedTopics}
                                                onChange={(val) => handleTlaChange(item.id, 'selectedTopics', val)}
                                                error={errors[`tla_${item.id}_selectedTopics`]}
                                            />
                                        </div>

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
                                                            onChange={(val) => handleTlaChange(item.id, 'assessmentType', val)}
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