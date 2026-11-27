import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle, useRef, useCallback } from "react";
import TextField from "../components/TextField.jsx";
import Dropdown from "../components/Dropdown.jsx";
import TextArea from "../components/TextArea.jsx";
import SpellCheckInput from "../components/SpellCheckInput.jsx";
import ColumnValidationBar from "../components/ColumnValidationBar.jsx";
import { checkSpelling, subscribeWhitelist } from "../utils/spellChecker.js";
import { Activity, Plus, Award, X, Edit2, PlusCircle } from "react-feather";
import { fetchJson } from "../utils/api.js";
import styles from "../styles/Form.module.sass";
import tStyles from "../styles/TopicSelector.module.sass";

// Serialization helpers for deep change detection
const serializeTlas = (items) => {
    if (!Array.isArray(items)) return '[]';
    return JSON.stringify(items.map(t => ({
        classPhase: t.classPhase || '',
        performedBy: t.performedBy || '',
        tlaName: (t.tlaName || '').trim(),
        tlaDescription: (t.tlaDescription || '').trim(),
        isLab: Boolean(t.isLab || t.laboratory),
        assessmentType: (t.assessmentType || '').trim(),
        assessmentDetail: (t.assessmentDetail || '').trim()
    })));
};

const serializeComments = (comments) => {
    if (!Array.isArray(comments)) return '[]';
    return JSON.stringify(comments.map(c => ({
        id: c.comment_id,
        resolved: Boolean(c.resolved_status)
    })));
};

const formatPerformedByLabel = (val) => {
    if (!val) return 'Student';
    const v = String(val).trim().toLowerCase();
    if (v === 't' || v === 'instructor' || v === 'teacher') return 'Instructor';
    return 'Student';
};

const LAB_PHASES = ['Pre-class', 'In-class', 'Post-class'];
const NON_LAB_PHASES = ['Asynchronous', 'Synchronous'];

const TLAForm = forwardRef(({
    iloId,
    weekNumber = 1,
    isOrientation = false,
    status,
    setUnresolvedCount,
    onCommentsChange,
    onValidationStateChange,
    onFixSpellField,
    highlightedFieldId = null,
    onClearHighlight,
    label,
    isSingleColumn = false,
    courseHasLab = true,
    hasLoadedCourseMeta = false
}, ref) => {
    const allowedPhases = useMemo(
        () => (courseHasLab ? LAB_PHASES : NON_LAB_PHASES),
        [courseHasLab]
    );

    const [isLoading, setIsLoading] = useState(true);
    const [errors, setErrors] = useState({});
    const [tlas, setTlas] = useState([]);
    const [newestCardId, setNewestCardId] = useState(null);
    const [whitelistVersion, setWhitelistVersion] = useState(0);
    const scrollContainerRef = useRef(null);

    const [reviewComments, setReviewComments] = useState([]);
    const initialTlasRef = useRef(null);
    const initialCommentsRef = useRef(null);

    useEffect(() => {
        return subscribeWhitelist(() => {
            setWhitelistVersion(v => v + 1);
        });
    }, []);

    // Automatically force isLab to false on non-Lab courses once course metadata and TLAs have loaded
    useEffect(() => {
        if (!isLoading && hasLoadedCourseMeta && !courseHasLab) {
            setTlas(prev => {
                const needsReset = prev.some(t => Boolean(t.isLab || t.laboratory));
                if (!needsReset) return prev;
                return prev.map(t => ({ ...t, isLab: false, laboratory: false }));
            });
        }
    }, [isLoading, hasLoadedCourseMeta, courseHasLab]);

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

    const mapDbToUi = useCallback((tla) => {
        const rawLab = Boolean(tla.isLab || tla.is_lab || tla.laboratory || false);
        return {
            ...tla,
            performedBy: formatPerformedByLabel(tla.performedBy),
            classPhase: normalizeClassPhase(tla.classPhase),
            isLab: rawLab,
            laboratory: rawLab
        };
    }, []);

    const mapUiToDb = (tla) => {
        const resolvedLab = courseHasLab ? Boolean(tla.isLab) : false;
        return {
            ...tla,
            isLab: resolvedLab,
            laboratory: resolvedLab,
            performedBy: tla.performedBy === 'Instructor' ? 'T' : tla.performedBy === 'Student' ? 'S' : tla.performedBy
        };
    };

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

                const initialComments = (Array.isArray(targetedComments) ? targetedComments : []).map(c => ({
                    ...c,
                    resolved_status: c.resolved_status === 1 || c.resolved_status === true,
                    return_number: Number(c.return_number) || 1,
                    return_date: c.return_date || c.createdAt
                }));
                setReviewComments(initialComments);

                if (existingTlas && existingTlas.length > 0) {
                    const mappedTlas = existingTlas.map(mapDbToUi);
                    setTlas(mappedTlas);
                    initialTlasRef.current = serializeTlas(mappedTlas);
                } else {
                    // COMP-004 & COMP-011: Start with a truly blank TLA canvas [] by default
                    setTlas([]);
                    initialTlasRef.current = serializeTlas([]);
                }
                initialCommentsRef.current = serializeComments(initialComments);
            } catch (error) {
                console.error("Error fetching TLA data components:", error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        fetchTlaData();
        return () => { mounted = false; };
    }, [iloId, isOrientation, status, mapDbToUi]);

    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
        if (onCommentsChange) {
            onCommentsChange(reviewComments);
        }
    }, [reviewComments, setUnresolvedCount, onCommentsChange]);

    // Live column validation + assessment check + spell-check items (drives ColumnValidationBar & FormNavigation Save gate)
    const liveValidationState = useMemo(() => {
        void whitelistVersion;
        const contentIssues = [];
        const spellItems = [];
        const coveredPhases = new Set();
        let validItemCount = 0;
        let assignedAssessmentCount = 0;

        if (!tlas || tlas.length === 0) {
            contentIssues.push(
                courseHasLab
                    ? 'Add at least 1 valid TLA for each phase: Pre-class, In-class, and Post-class (3 total).'
                    : 'Add at least 1 valid TLA for each phase: Asynchronous and Synchronous (2 total).'
            );
        } else {
            tlas.forEach((tla, idx) => {
                const tlaNum = idx + 1;
                const labelPrefix = `TLA #${tlaNum}${tla.tlaName?.trim() ? ` (${tla.tlaName.trim()})` : ''}`;
                const missing = [];

                if (!tla.performedBy) missing.push('Performed By');
                if (!tla.classPhase) {
                    missing.push('Class Phase');
                } else if (!allowedPhases.includes(tla.classPhase)) {
                    missing.push(`Valid Class Phase (${allowedPhases.join(' / ')})`);
                }
                if (!tla.tlaName || !tla.tlaName.trim()) missing.push('TLA Name');
                if (!tla.tlaDescription || !tla.tlaDescription.trim()) missing.push('Description');

                // Assessment Name counts as an assigned assessment; Assessment Detail is optional
                const hasAssessmentName = Boolean(tla.assessmentType && tla.assessmentType.trim());
                const hasAssessmentDetail = Boolean(tla.assessmentDetail && tla.assessmentDetail.trim());
                if (hasAssessmentName) {
                    assignedAssessmentCount += 1;
                } else if (hasAssessmentDetail) {
                    missing.push('Assessment Name (required when Detail is provided)');
                }

                if (missing.length > 0) {
                    contentIssues.push(`${labelPrefix}: Missing ${missing.join(', ')}.`);
                } else {
                    validItemCount += 1;
                    coveredPhases.add(tla.classPhase);
                }

                const nameMisspelled = checkSpelling(tla.tlaName || '');
                if (nameMisspelled.length > 0) {
                    spellItems.push({
                        fieldId: `tla-${tla.id}-tlaName`,
                        label: `${labelPrefix} — TLA Name`,
                        words: nameMisspelled
                    });
                }

                const descMisspelled = checkSpelling(tla.tlaDescription || '');
                if (descMisspelled.length > 0) {
                    spellItems.push({
                        fieldId: `tla-${tla.id}-tlaDescription`,
                        label: `${labelPrefix} — Description`,
                        words: descMisspelled
                    });
                }

                const typeMisspelled = checkSpelling(tla.assessmentType || '');
                if (typeMisspelled.length > 0) {
                    spellItems.push({
                        fieldId: `tla-${tla.id}-assessmentType`,
                        label: `${labelPrefix} — Assessment Name`,
                        words: typeMisspelled
                    });
                }

                const detailMisspelled = checkSpelling(tla.assessmentDetail || '');
                if (detailMisspelled.length > 0) {
                    spellItems.push({
                        fieldId: `tla-${tla.id}-assessmentDetail`,
                        label: `${labelPrefix} — Assessment Detail`,
                        words: detailMisspelled
                    });
                }
            });

            const missingPhases = allowedPhases.filter(phase => !coveredPhases.has(phase));
            if (missingPhases.length > 0) {
                contentIssues.push(
                    `Missing valid TLA for ${missingPhases.length === 1 ? 'phase' : 'phases'}: ${missingPhases.join(', ')}.`
                );
            }
        }

        const assessmentInfo = {
            count: assignedAssessmentCount,
            isValid: assignedAssessmentCount >= 1,
            tooltip: assignedAssessmentCount >= 1
                ? `${assignedAssessmentCount} ${assignedAssessmentCount === 1 ? 'assessment' : 'assessments'} assigned across TLAs.`
                : 'Assign at least 1 assessment (Name required; Detail is optional) across your TLAs.'
        };

        return {
            contentIssues,
            validItemCount,
            validSummaryText: `${validItemCount} valid ${validItemCount === 1 ? 'TLA' : 'TLAs'} covering all ${allowedPhases.length} phases (${allowedPhases.join(', ')}).`,
            assessmentInfo,
            spellItems,
            isValid: contentIssues.length === 0 && assessmentInfo.isValid && spellItems.length === 0
        };
    }, [tlas, whitelistVersion, allowedPhases, courseHasLab]);

    useEffect(() => {
        if (!isLoading && onValidationStateChange) {
            onValidationStateChange(liveValidationState);
        }
    }, [isLoading, liveValidationState, onValidationStateChange]);

    // Only scroll when the newly added card extends outside the visible scroll viewport (i.e. container is full)
    const scrollCardIntoViewIfNeeded = (cardId) => {
        requestAnimationFrame(() => {
            setTimeout(() => {
                const container = scrollContainerRef.current;
                if (!container) return;
                const cardEl = container.querySelector(`[data-card-id="${String(cardId).replace(/"/g, '\\"')}"]`);
                if (!cardEl) return;
                const containerRect = container.getBoundingClientRect();
                const cardRect = cardEl.getBoundingClientRect();

                if (cardRect.top >= containerRect.top && cardRect.bottom <= containerRect.bottom) {
                    return;
                }
                if (cardRect.height > containerRect.height || cardRect.top < containerRect.top) {
                    const targetTop = container.scrollTop + (cardRect.top - containerRect.top) - 12;
                    container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
                    return;
                }
                const targetTop = container.scrollTop + (cardRect.bottom - containerRect.bottom) + 12;
                container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
            }, 60);
        });
    };

    const buildTlaEntryFromOption = (opt, offsetIdx = 0) => {
        const generatedId = Date.now() + offsetIdx + Math.random();
        const mapped = mapDbToUi(opt);
        return {
            ...mapped,
            id: generatedId,
            isLab: courseHasLab ? Boolean(mapped.isLab) : false,
            laboratory: courseHasLab ? Boolean(mapped.isLab) : false,
            assessmentType: opt.assessmentType || '',
            assessmentDetail: opt.assessmentDetail || '',
            assessmentIloId: opt.assessmentIloId ?? null,
            assessmentPeriod: opt.assessmentPeriod ?? null,
            assessmentWeight: opt.assessmentWeight ?? null
        };
    };

    const handleTlaAdd = (initialName = '') => {
        const nameStr = typeof initialName === 'string' ? initialName.trim() : '';
        const generatedId = Date.now() + Math.random();
        setNewestCardId(generatedId);
        setTlas(prev => [...prev, {
            id: generatedId, classPhase: '', performedBy: '',
            tlaName: nameStr, tlaDescription: '', laboratory: false, isLab: false,
            assessmentType: '', assessmentDetail: ''
        }]);
        setTimeout(() => setNewestCardId(null), 1500);
        scrollCardIntoViewIfNeeded(generatedId);
    };

    const handleTlaDelete = (idToDelete) => {
        setTlas(tlas.filter((item) => item.id !== idToDelete));
    };

    const handleTlaChange = (id, field, value) => {
        setTlas(prevTlas => prevTlas.map(tla => tla.id === id ? { ...tla, [field]: value } : tla));
        const errorKey = `tla_${id}_${field}`;
        if (errors[errorKey]) setErrors(prev => ({ ...prev, [errorKey]: null }));
        if (highlightedFieldId === `tla-${id}-${field}` && onClearHighlight) {
            onClearHighlight();
        }
    };

    const validateForm = () => {
        const errs = [...liveValidationState.contentIssues];
        if (!liveValidationState.assessmentInfo.isValid) {
            errs.push(liveValidationState.assessmentInfo.tooltip);
        }

        const newErrors = {};
        (tlas || []).forEach((tla) => {
            if (!tla.classPhase || !allowedPhases.includes(tla.classPhase)) {
                newErrors[`tla_${tla.id}_classPhase`] = "Required";
            }
            if (!tla.performedBy) {
                newErrors[`tla_${tla.id}_performedBy`] = "Required";
            }
            if (!tla.tlaName || !tla.tlaName.trim()) {
                newErrors[`tla_${tla.id}_tlaName`] = "TLA Name required";
            }
            if (!tla.tlaDescription || !tla.tlaDescription.trim()) {
                newErrors[`tla_${tla.id}_tlaDescription`] = "Description required";
            }
            if (tla.assessmentDetail?.trim() && !tla.assessmentType?.trim()) {
                newErrors[`tla_${tla.id}_assessmentType`] = "Assessment Name required";
            }
        });
        setErrors(newErrors);

        return errs.length > 0 ? errs : null;
    };

    const collectSpellWarnings = () => {
        return liveValidationState.spellItems.map(item => ({
            section: 'Teaching & Learning Activities',
            field: item.label,
            words: item.words
        }));
    };

    useImperativeHandle(ref, () => ({
        validate: validateForm,
        getTlas: () => tlas,
        importPreviousTlas: (incomingList) => {
            if (!Array.isArray(incomingList) || incomingList.length === 0) return;
            const existingNames = new Set(tlas.map(t => String(t.tlaName || '').trim().toLowerCase()).filter(Boolean));
            const toAdd = incomingList
                .filter(opt => {
                    const name = String(opt.tlaName || '').trim().toLowerCase();
                    if (!name) return true;
                    return !existingNames.has(name);
                })
                .map((opt, idx) => buildTlaEntryFromOption(opt, idx));
            if (toAdd.length === 0) return;
            const lastAddedId = toAdd[toAdd.length - 1].id;
            setNewestCardId(lastAddedId);
            setTlas(prev => [...prev, ...toAdd]);
            setTimeout(() => setNewestCardId(null), 1500);
            scrollCardIntoViewIfNeeded(lastAddedId);
        },
        hasChanges: () => {
            if (initialTlasRef.current === null) return false;
            const tlasChanged = serializeTlas(tlas) !== initialTlasRef.current;
            const commentsChanged = serializeComments(reviewComments) !== initialCommentsRef.current;
            return tlasChanged || commentsChanged;
        },
        resetInitialState: () => {
            initialTlasRef.current = serializeTlas(tlas);
            initialCommentsRef.current = serializeComments(reviewComments);
        },
        getSpellWarnings: collectSpellWarnings,
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
            initialTlasRef.current = serializeTlas(tlas);
            initialCommentsRef.current = serializeComments(reviewComments);
        },
        getCommentTargetLabel: (comment) => {
            if (comment.target_title) return comment.target_title;
            const match = tlas.find(t => Number(t.id) === Number(comment.target_id) || Number(t.tla_id) === Number(comment.target_id));
            return match ? (match.tlaName || match.tla_name) : `TLA Element ID: ${comment.target_id}`;
        }
    }));

    if (isLoading) return <div className={styles.emptyChecklist}>Loading TLA Configurations...</div>;

    const emptySpots = Math.max(2, tlas.length) - tlas.length;
    const placeholderCards = Array.from({ length: emptySpots }).map((_, i) => {
        if (tlas.length === 0 && i === 0) {
            return (
                <div key="placeholder-empty-prompt" className={`${tStyles.emptyPromptCard} ${styles.tlaPlaceholderScale}`}>
                    <div className={tStyles.emptyPromptIcon}>
                        <PlusCircle size={20} />
                    </div>
                    <div className={tStyles.emptyPromptTitle}>
                        No activities added for {isOrientation ? 'orientation' : `week ${weekNumber}`} yet
                    </div>
                    <div className={tStyles.emptyPromptText}>
                        Click <strong>Add TLA</strong> to create a new activity, or click <strong>Import Previous</strong> in the top bar.
                    </div>
                </div>
            );
        }
        return (
            <div key={`placeholder-${i}`} className={`${tStyles.placeholderCard} ${styles.tlaPlaceholderScale}`}>
                <div className={tStyles.placeholderHeader} />
                <div className={tStyles.placeholderBody} style={{ padding: '12px 14px', gap: '9px' }}>
                    <div className={tStyles.placeholderLine} style={{ flex: 'none', height: '42px', maxHeight: '42px' }} />
                    {courseHasLab && (
                        <div className={tStyles.placeholderLine} style={{ flex: 'none', height: '40px', maxHeight: '40px' }} />
                    )}
                    <div className={tStyles.placeholderLine} style={{ flex: 1, minHeight: '56px', maxHeight: 'none' }} />
                    <div className={tStyles.placeholderLine} style={{ flex: 'none', height: '90px', maxHeight: '90px' }} />
                </div>
            </div>
        );
    });

    return (
        <div className={tStyles.container} style={{ display: "flex", flexDirection: "column", height: "100%", flexGrow: 1, minHeight: 0 }}>
            {label && <label className={tStyles.label}>{label}</label>}

            <div className={tStyles.mainWrapper}>
                <div className={tStyles.stickyHeader}>
                    {/* Row 1: Column Title + Inline Validation Bar */}
                    <div className={tStyles.headerTopRow}>
                        <div className={tStyles.headerTitleGroup}>
                            <Activity size={15} className={tStyles.headerTitleIcon} />
                            <span className={tStyles.headerTitleText}>Teaching &amp; Learning Activities</span>
                        </div>

                        <ColumnValidationBar
                            columnName="TLAs"
                            contentIssues={liveValidationState.contentIssues}
                            validItemCount={liveValidationState.validItemCount}
                            validSummaryText={liveValidationState.validSummaryText}
                            assessmentInfo={liveValidationState.assessmentInfo}
                            spellItems={liveValidationState.spellItems}
                            onFixSpellField={onFixSpellField}
                        />
                    </div>

                    {/* Row 2: Column Action Buttons */}
                    <div className={tStyles.headerBottomRow}>
                        <div className={tStyles.headerActionsGroup}>
                            <button
                                type="button"
                                className={tStyles.mainAddBtn}
                                onClick={() => handleTlaAdd()}
                            >
                                <Plus size={15} className={tStyles.btnIcon} /> <span>Add TLA</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={tStyles.scrollContainer} ref={scrollContainerRef}>
                    <div className={`${tStyles.configArea} ${isSingleColumn ? tStyles.configAreaTwoCol : ''}`}>
                        {tlas.map((item) => {
                            const isNewlyAdded = item.id === newestCardId;
                            const hasAssessmentData = Boolean(item.assessmentType || item.assessmentDetail);
                            const nameFieldId = `tla-${item.id}-tlaName`;
                            const descFieldId = `tla-${item.id}-tlaDescription`;
                            const typeFieldId = `tla-${item.id}-assessmentType`;
                            const detailFieldId = `tla-${item.id}-assessmentDetail`;
                            const phaseValue = allowedPhases.includes(item.classPhase) ? item.classPhase : '';

                            return (
                                <div
                                    key={item.id}
                                    data-card-id={item.id}
                                    className={`${styles.tlaCardCopycat} ${isNewlyAdded ? tStyles.newEntry : ''}`}
                                >
                                    <div className={tStyles.topicHeaderCard}>
                                        <div className={tStyles.topicTitleGroup}>
                                            {courseHasLab && (
                                                <div
                                                    className={`${styles.tlaLabDot} ${item.isLab ? styles.activeLabDot : ''}`}
                                                    title={item.isLab ? "Laboratory" : "Standard"}
                                                />
                                            )}
                                            <div className={`${tStyles.inputWrapper} ${highlightedFieldId === nameFieldId ? tStyles.spellHighlightedInput : ''}`}>
                                                <Edit2 size={12} className={tStyles.editIcon} />
                                                <SpellCheckInput
                                                    className={tStyles.topicTitleInput}
                                                    value={item.tlaName}
                                                    data-spell-field-id={nameFieldId}
                                                    onChange={(e) => handleTlaChange(item.id, 'tlaName', e.target.value)}
                                                    placeholder="Enter TLA Name..."
                                                />
                                            </div>
                                        </div>
                                        <button type="button" className={tStyles.removeTopicBtn} onClick={() => handleTlaDelete(item.id)} title="Remove TLA">
                                            <X color={"white"} size={15} />
                                        </button>
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
                                                    options={allowedPhases}
                                                    label={'Class Phase'}
                                                    value={phaseValue}
                                                    onChange={(val) => handleTlaChange(item.id, 'classPhase', val)}
                                                    error={errors[`tla_${item.id}_classPhase`]}
                                                />
                                            </div>
                                        </div>

                                        {courseHasLab && (
                                            <div className={styles.fieldsGridOne}>
                                                <div className={styles.tlaFieldSubtopicStyle}>
                                                    <div className="generic-field-container">
                                                        <div className="generic-field-label" style={{ fontWeight: 600, fontSize: 11, marginBottom: 4, color: '#4A5568' }}>Setting Focus</div>
                                                        <div className={`${styles.labCheckboxWrapper} ${item.isLab ? styles.isLabActive : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                id={`lab_check_${item.id}`}
                                                                checked={Boolean(item.isLab)}
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
                                        )}

                                        <div className={`${styles.tlaFieldSubtopicStyle} ${styles.tlaDescriptionHigh}`}>
                                            <TextArea
                                                label={'TLA Description'}
                                                value={item.tlaDescription}
                                                onChange={(val) => handleTlaChange(item.id, 'tlaDescription', val)}
                                                error={errors[`tla_${item.id}_tlaDescription`]}
                                                rows={3}
                                                placeholder="Describe the activity..."
                                                fieldId={descFieldId}
                                                isHighlighted={highlightedFieldId === descFieldId}
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
                                                            label={'Name'}
                                                            value={item.assessmentType}
                                                            onChange={(val) => handleTlaChange(item.id, 'assessmentType', val)}
                                                            placeholder="e.g. Case Study, Quiz"
                                                            fieldId={typeFieldId}
                                                            isHighlighted={highlightedFieldId === typeFieldId}
                                                            error={errors[`tla_${item.id}_assessmentType`]}
                                                        />
                                                    </div>
                                                    <div className={styles.tlaFieldSubtopicStyle}>
                                                        <TextField
                                                            label={'Detail (optional)'}
                                                            value={item.assessmentDetail}
                                                            onChange={(val) => handleTlaChange(item.id, 'assessmentDetail', val)}
                                                            placeholder="e.g. 10-item quiz or short reflection"
                                                            fieldId={detailFieldId}
                                                            isHighlighted={highlightedFieldId === detailFieldId}
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
