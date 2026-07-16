import React, { useState, useEffect, useRef } from "react";
import SkeletonA from "../layouts/Skeleton.jsx";
import HeaderA from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import TextField from "../components/TextField.jsx";
import Dropdown from "../components/Dropdown.jsx";
import DropdownMultiSelect from "../components/DropdownMultiSelect.jsx";
import TypeableDropdown from "../components/TypeableDropdown";
import TextArea from "../components/TextArea.jsx";
import Duplicator from "../components/Duplicator.jsx";
import { X, CheckCircle, MessageSquare, Plus, Award, Trash2 } from "react-feather";
import SideNavigation from "../components/SideNavigation.jsx";

// Imported universal API client utility
import { fetchJson } from "../utils/api.js";
import CommentMessage from "../components/CommentMessage.jsx";

/* Inline modal component */
function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3 id="modal-title">{title}</h3>
                    <button type="button" aria-label="Close" onClick={onClose} className={styles.closeIcon}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {actions && <div className={styles.modalActions}>{actions}</div>}
            </div>
        </div>
    );
}

const TLAForm = () => {
    const navigate = useNavigate();
    const { courseCode, iloId, status } = useParams();

    const FLIPPED_OPTIONS = ['Pre-class', 'In-class', 'Post-class'];
    const STANDARD_OPTIONS = ['Asynchronous', 'Synchronous'];

    const [isLoading, setIsLoading] = useState(true);
    const [flipped, setFlipped] = useState(false);
    const [availableTopics, setAvailableTopics] = useState([]);
    const [topicIdMap, setTopicIdMap] = useState({});
    const [assessmentSuggestions, setAssessmentSuggestions] = useState([]);
    const [errors, setErrors] = useState({});
    const [tlas, setTlas] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [newestCardId, setNewestCardId] = useState(null);

    // Checklist State for TLA Reviews
    const [reviewComments, setReviewComments] = useState([]);
    const workspaceContainerRef = useRef(null);

    // --- Data Normalization Helpers ---
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
        const hasExistingAssessment = Boolean(tla.assessmentType || tla.assessmentDetail);
        return {
            ...tla,
            performedBy: tla.performedBy === 'T' ? 'Instructor' : tla.performedBy === 'S' ? 'Student' : tla.performedBy,
            classPhase: normalizeClassPhase(tla.classPhase),
            isLab: Boolean(tla.isLab || tla.is_lab || false),
            hasAssessment: hasExistingAssessment
        };
    };

    const mapUiToDb = (tla) => ({
        ...tla,
        performedBy: tla.performedBy === 'Instructor' ? 'T' : tla.performedBy === 'Student' ? 'S' : tla.performedBy,
        assessmentType: tla.hasAssessment ? tla.assessmentType : '',
        assessmentDetail: tla.hasAssessment ? tla.assessmentDetail : ''
    });

    // Fetch Core Data & Filtered TLA Review Comments
    useEffect(() => {
        const fetchTlaData = async () => {
            try {
                const tlaUrl = `/api/tlas/ilo/${iloId}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/tlas`;

                const fetchPromises = [fetchJson(tlaUrl)];
                if (status === 'returned') {
                    fetchPromises.push(fetchJson(commentsUrl));
                }

                const results = await Promise.all(fetchPromises);
                const data = results[0];
                const targetedComments = results[1] || [];

                const { availableTopics, topicIdMap, tlas: existingTlas, assessmentTypeSuggestions } = data;

                setAvailableTopics(availableTopics || []);
                setTopicIdMap(topicIdMap || {});
                setAssessmentSuggestions(assessmentTypeSuggestions || ['Case Study', 'Presentation', 'Exam', 'Report', 'Lab Exercise']);

                // Normalize comments data states
                setReviewComments(targetedComments.map(c => ({
                    ...c,
                    resolved_status: c.resolved_status === 1 || c.resolved_status === true
                })));

                if (existingTlas && existingTlas.length > 0) {
                    const mappedTlas = existingTlas.map(mapDbToUi);
                    setTlas(mappedTlas);

                    const isFlipped = mappedTlas.some(t => FLIPPED_OPTIONS.includes(t.classPhase));
                    setFlipped(isFlipped);
                } else {
                    setTlas([{
                        id: Date.now(), selectedTopics: [], classPhase: '', performedBy: '',
                        tlaName: '', tlaDescription: '', laboratory: false, isLab: false,
                        hasAssessment: false, assessmentType: '', assessmentDetail: ''
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

    // Handle checklist interactions — persists immediately so approvers see the check
    const handleToggleCommentResolution = (commentId) => {
        const current = reviewComments.find(c => c.comment_id === commentId);
        const nextStatus = !(current?.resolved_status);
        setReviewComments(prev => prev.map(c =>
            c.comment_id === commentId ? { ...c, resolved_status: nextStatus } : c
        ));
        fetchJson(`/api/comments/update-resolution`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: [{ comment_id: commentId, resolved_status: nextStatus ? 1 : 0 }] })
        }).catch(err => console.warn('Failed to persist comment resolution:', err?.message));
    };

    const getAvailableOptionsForTla = (currentTlaId) => {
        // Return all available topics to allow repeating ILO topics across multiple TLAs
        return availableTopics;
    };

    const goBackHandler = () => navigate(-1);

    const handleFlippedChange = (e) => {
        const isChecked = e.target.checked;
        setFlipped(isChecked);
        setTlas(prevTlas => prevTlas.map(tla => ({ ...tla, classPhase: '' })));
    };

    const handleTlaAdd = () => {
        const generatedId = Date.now() + Math.random();
        setNewestCardId(generatedId);
        setTlas([...tlas, {
            id: generatedId, selectedTopics: [], classPhase: '', performedBy: '',
            tlaName: '', tlaDescription: '', laboratory: false, isLab: false,
            hasAssessment: false, assessmentType: '', assessmentDetail: ''
        }]);

        // Clear highlight flash after 1.2 seconds
        setTimeout(() => {
            setNewestCardId(null);
        }, 1200);
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

            if (tla.hasAssessment) {
                if (!tla.assessmentType.trim()) newErrors[`tla_${tla.id}_assessmentType`] = "Required";
                if (!tla.assessmentDetail.trim()) newErrors[`tla_${tla.id}_assessmentDetail`] = "Detail required";
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveClick = async () => {
        if (!validateForm()) return;

        const payloadTlas = tlas.map(mapUiToDb);

        try {
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

            await fetchJson(`/api/tlas/ilo/${iloId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tlas: payloadTlas,
                    topicIdMap
                })
            });
            setShowConfirm(true);
        } catch (error) {
            console.error("Error saving TLAs details profile:", error);
            alert("Failed to save changes. Please view logs.");
        }
    };

    const getCommentTargetLabel = (comment) => {
        if (comment.target_title) return comment.target_title;
        const match = tlas.find(t =>
            Number(t.topic_tla_id) === Number(comment.target_id) || Number(t.id) === Number(comment.target_id)
        );
        return match ? match.tlaName : `TLA Element ID: ${comment.target_id}`;
    };

    if (isLoading) return <div className={styles.emptyChecklist}>Loading Workspace Environments...</div>;

    return (
        <SkeletonA
            header={<HeaderA role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    <FormNavigation goBack={goBackHandler} onSave={handleSaveClick} />

                    <div className={styles.mainCont}>
                        <div className={styles.leftCont}>
                            <div className={styles['form-container']}>

                                {/* Dynamic Workspace Dashboard Header Segment */}
                                <div className={styles.workspaceHeader}>
                                    <div className={styles.workspaceTitleBlock}>
                                        <h2 className={styles.workspaceTitle}>Teaching & Learning Activities</h2>
                                    </div>
                                    <div className={styles.flippedBadgeContainer}>
                                        <input
                                            checked={flipped}
                                            onChange={handleFlippedChange}
                                            type="checkbox"
                                            id="flippedCheck"
                                            className={styles.flippedCheckbox}
                                        />
                                        <label htmlFor="flippedCheck" className={styles.flippedLabel}>Flipped Approach</label>
                                    </div>
                                </div>

                                {/* Main Workspace Cards Deck Map */}
                                <div ref={workspaceContainerRef} className={styles.tlaWorkspaceCardsDeck}>
                                    {tlas.map((item, index) => {
                                        const isNewlyAdded = item.id === newestCardId;
                                        return (
                                            <div
                                                key={item.id}
                                                className={`${styles.tlaCard} ${isNewlyAdded ? styles.newlyAddedCard : ''}`}
                                            >
                                                {/* Top Accent Striping Decor */}
                                                <div className={`${styles.cardAccentStrip} ${item.isLab ? styles.isLabAccent : ''}`} />

                                                {/* Card Header contextual menu controls */}
                                                <div className={styles.cardHeaderTop}>
                                                    <div className={styles.cardHeaderLeft}>
                                                        <div className={`${styles.cardHeaderIndex} ${item.isLab ? styles.isLabIndex : ''}`}>
                                                            {index + 1}
                                                        </div>
                                                        {/*<span className={styles.cardHeaderTitle}>*/}
                                                        {/*    {item.tlaName ? item.tlaName : "New Unnamed Activity Instance"}*/}
                                                        {/*</span>*/}
                                                    </div>

                                                    {tlas.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTlaDelete(item.id)}
                                                            className={styles.cardRemoveBtn}
                                                            title="Delete Activity Node"
                                                        >
                                                            <Trash2 size={15} />
                                                            <span>Remove</span>
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Core Configuration Layout Fields Grid */}
                                                <div className={styles.cardBodyContent}>
                                                    <div className={styles.fieldsGridTwo}>
                                                        <TextField
                                                            label={'TLA Name'}
                                                            value={item.tlaName}
                                                            onChange={(val) => handleTlaChange(item.id, 'tlaName', val)}
                                                            error={errors[`tla_${item.id}_tlaName`]}
                                                            placeholder="e.g., Interactive Code Demo..."
                                                        />
                                                        <Dropdown
                                                            options={['Student', 'Instructor']}
                                                            label={'Performed By'}
                                                            value={item.performedBy}
                                                            onChange={(val) => handleTlaChange(item.id, 'performedBy', val)}
                                                            error={errors[`tla_${item.id}_performedBy`]}
                                                        />

                                                    </div>

                                                    <div className={styles.fieldsGridTwo}>
                                                        <Dropdown
                                                            options={flipped ? FLIPPED_OPTIONS : STANDARD_OPTIONS}
                                                            label={'Class Phase'}
                                                            value={item.classPhase}
                                                            onChange={(val) => handleTlaChange(item.id, 'classPhase', val)}
                                                            error={errors[`tla_${item.id}_classPhase`]}
                                                        />

                                                        {/* Modernized Laboratory Toggle Configuration Field */}
                                                        <div className={`${styles.labCheckboxWrapper} ${item.isLab ? styles.isLabActive : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                id={`lab_check_${item.id}`}
                                                                checked={item.isLab}
                                                                onChange={(e) => handleTlaChange(item.id, 'isLab', e.target.checked)}
                                                                className={styles.labCheckboxInput}
                                                            />
                                                            <label htmlFor={`lab_check_${item.id}`} className={`${styles.labCheckboxLabel} ${item.isLab ? styles.isLabActiveLabel : ''}`}>
                                                                Laboratory
                                                            </label>
                                                        </div>
                                                    </div>


                                                        <DropdownMultiSelect
                                                            options={getAvailableOptionsForTla(item.id)}
                                                            label={'Topic Title(s)'}
                                                            value={item.selectedTopics}
                                                            onChange={(val) => handleTlaChange(item.id, 'selectedTopics', val)}
                                                            error={errors[`tla_${item.id}_selectedTopics`]}
                                                        />



                                                    <TextArea
                                                        label={'TLA Description'}
                                                        value={item.tlaDescription}
                                                        onChange={(val) => handleTlaChange(item.id, 'tlaDescription', val)}
                                                        error={errors[`tla_${item.id}_tlaDescription`]}
                                                        rows={3}
                                                        placeholder="Describe the activity procedures and expected outputs..."
                                                    />

                                                    {/* Optional Assessment Framework Wrapper */}
                                                    <div className={styles.assessmentSectionWrapper}>
                                                        {!item.hasAssessment ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTlaChange(item.id, 'hasAssessment', true)}
                                                                className={styles.addAssessmentBtn}
                                                            >
                                                                <Plus size={15} />
                                                                Add Assessment
                                                            </button>
                                                        ) : (
                                                            <div className={styles.assessmentBox}>
                                                                <div className={styles.assessmentBoxHeader}>
                                                                    <div className={styles.assessmentBoxTitle}>
                                                                        <Award size={15} />
                                                                        <span>Linked Assessment Matrix (Optional)</span>
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleTlaChange(item.id, 'hasAssessment', false);
                                                                            handleTlaChange(item.id, 'assessmentType', '');
                                                                            handleTlaChange(item.id, 'assessmentDetail', '');
                                                                        }}
                                                                        className={styles.removeAssessmentBtn}
                                                                        title="Remove Assessment"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>

                                                                <div className={styles.fieldsGridTwo}>
                                                                    <TypeableDropdown
                                                                        options={assessmentSuggestions}
                                                                        label={'Assessment Type'}
                                                                        value={item.assessmentType}
                                                                        onChange={(val) => handleTlaChange(item.id, 'assessmentType', val)}
                                                                        error={errors[`tla_${item.id}_assessmentType`]}
                                                                    />
                                                                    <TextField
                                                                        label={'Assessment Detail'}
                                                                        value={item.assessmentDetail}
                                                                        onChange={(val) => handleTlaChange(item.id, 'assessmentDetail', val)}
                                                                        error={errors[`tla_${item.id}_assessmentDetail`]}
                                                                        placeholder="e.g., Usability Metrics and KPIs"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className={styles.duplicatorContainerWrapper}>
                                    <Duplicator onAdd={handleTlaAdd} name={'TLA'} />
                                </div>

                                <InlineModal
                                    isOpen={showConfirm}
                                    title="Saved"
                                    onClose={() => setShowConfirm(false)}
                                >
                                    <div className={styles.list}>
                                        <div className={styles.modalSuccessIconWrapper}>
                                            <CheckCircle size={24} color="#10b981" />
                                        </div>
                                        <div>
                                            <div className={styles.modalSuccessTitle}>Saved Successfully</div>
                                            <div className={styles.modalSuccessText}>TLAs data elements synchronized successfully.</div>
                                        </div>
                                    </div>
                                </InlineModal>
                            </div>
                        </div>

                        {/* Interactive Dynamic TLA Review Corrections Card Container */}
                        {status === 'returned' && (
                            <div className={styles.rightCont}>
                                <div className={styles.checklistCard}>
                                    <div className={styles.checklistHeader}>
                                        <MessageSquare size={18} className={styles.headerIcon} />
                                        <h3>Review Corrections</h3>
                                    </div>

                                    {reviewComments.length === 0 ? (
                                        <div className={styles.emptyChecklist}>
                                            <p>No unresolved activity layout notes found for this entry.</p>
                                        </div>
                                    ) : (
                                        <div className={styles.checklistWrapper}>
                                            {reviewComments.map((comment) => (
                                                <label
                                                    key={comment.comment_id}
                                                    className={`${styles.checklistItem} ${comment.resolved_status ? styles.itemResolved : ''}`}
                                                >
                                                    <div className={styles.checkboxControl}>
                                                        <input
                                                            type="checkbox"
                                                            checked={comment.resolved_status}
                                                            onChange={() => handleToggleCommentResolution(comment.comment_id)}
                                                        />
                                                        <span className={styles.customCheckmark}></span>
                                                    </div>

                                                    <div className={styles.commentContent}>
                                                        <div className={styles.targetContextBadge}>
                                                            {/*<span className={styles.targetPrefix}>Target:</span>*/}
                                                            <span className={styles.targetText}>{getCommentTargetLabel(comment)}</span>
                                                        </div>

                                                        <CommentMessage className={styles.commentMessage} message={comment.message} />

                                                        <div className={styles.commentMetadata}>
                                                            <span className={styles.metaRole}>{comment.commenter_role.replace(/_/g, ' ')}</span>
                                                            <span className={styles.metaDivider}>•</span>
                                                            <span className={styles.metaDate}>
                                                                {new Date(comment.createdAt).toLocaleDateString(undefined, {
                                                                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            }
        />
    );
};

export default TLAForm;