import React, { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import SideNavigation from "../components/SideNavigation.jsx";
import TopicSelector from "../components/TopicSelector.jsx";
import { X, CheckCircle, MessageSquare, AlertCircle, ChevronsRight } from 'react-feather';
import { fetchJson } from "../utils/api.js";

import TLAForm from "./TLAForm.jsx";
import ReferenceForm from "./ReferenceForm.jsx";

export function InlineModal({ isOpen, title, onClose, children, actions }) {
    if (!isOpen) return null;
    return (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h3>{title}</h3>
                    <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', padding: 6 }}>
                        <X size={16} />
                    </button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {actions && <div className={styles.modalActions}>{actions}</div>}
            </div>
        </div>
    );
}

// ==========================================
// 1. TOPICS SUB-FORM
// ==========================================
const TopicSubForm = forwardRef(({ iloId, previousWeekId, weekNumber = 1, isOrientation = false, status, setUnresolvedCount, courseCode }, ref) => {
    const [availableTopics, setAvailableTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [previousWeekTopics, setPreviousWeekTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reviewComments, setReviewComments] = useState([]);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function loadData() {
            try {
                const orientParam = isOrientation ? 'true' : 'false';
                const availableUrl = `/api/topics/available?iloId=${encodeURIComponent(iloId)}&isOrientation=${orientParam}`;
                const assignedUrl = `/api/topics/assigned/${encodeURIComponent(iloId)}?isOrientation=${orientParam}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/topics`;

                const pAvailable = fetchJson(availableUrl).catch(() => []);
                const pAssigned = fetchJson(assignedUrl).catch(() => []);
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);
                const pPrevTopics = (previousWeekId && !isOrientation)
                    ? fetchJson(`/api/topics/assigned/${encodeURIComponent(previousWeekId)}?isOrientation=false`).catch(() => [])
                    : Promise.resolve([]);

                const [resAvailable, resAssigned, resComments, resPrevTopics] = await Promise.all([
                    pAvailable,
                    pAssigned,
                    pComments,
                    pPrevTopics
                ]);
                if (!mounted) return;

                setAvailableTopics(Array.isArray(resAvailable) ? resAvailable : []);
                setSelectedTopics(Array.isArray(resAssigned) ? resAssigned : []);
                setPreviousWeekTopics(Array.isArray(resPrevTopics) ? resPrevTopics : []);

                if (status === 'returned' && Array.isArray(resComments)) {
                    setReviewComments(resComments.map(c => ({
                        ...c,
                        resolved_status: c.resolved_status === 1 || c.resolved_status === true
                    })));
                } else {
                    setReviewComments([]);
                }
            } catch (err) {
                console.error("Failed to load initial topics configurations:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [iloId, previousWeekId, isOrientation, status]);

    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
    }, [reviewComments, setUnresolvedCount]);

    // Resolves parent Topic title and one or multiple Subtopic titles for a comment
    const resolveTopicGroupsForComment = useCallback((comment) => {
        const allPools = [...selectedTopics, ...availableTopics];
        const targetIds = Array.isArray(comment.target_ids) && comment.target_ids.length > 0
            ? comment.target_ids
            : (comment.target_id != null ? [comment.target_id] : []);

        const localGroups = [];
        const addSubtopicToGroup = (topicId, topicTitle, subId, subTitle) => {
            const cleanTopicTitle = topicTitle || 'Topic';
            let grp = localGroups.find(
                g => (topicId && Number(g.topic_id) === Number(topicId)) || g.topic_title === cleanTopicTitle
            );
            if (!grp) {
                grp = {
                    topic_id: topicId,
                    topic_title: cleanTopicTitle,
                    subtopics: []
                };
                localGroups.push(grp);
            }
            if (subTitle && !grp.subtopics.some(s => s.title === subTitle)) {
                grp.subtopics.push({
                    subtopic_id: subId,
                    title: subTitle
                });
            }
        };

        // 1. Try matching target_ids against subtopics (and parent topics) in selectedTopics / availableTopics
        for (const tid of targetIds) {
            let matched = false;
            for (const topic of allPools) {
                const subs = Array.isArray(topic.subtopics) ? topic.subtopics : [];
                const subMatch = subs.find(s =>
                    Number(s.subtopic_id) === Number(tid) || Number(s.id) === Number(tid)
                );
                if (subMatch) {
                    addSubtopicToGroup(
                        topic.topic_id || topic.id,
                        topic.title || topic.topic_name || topic.name,
                        subMatch.subtopic_id || subMatch.id,
                        subMatch.title
                    );
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                const directTopic = allPools.find(t =>
                    Number(t.topic_id) === Number(tid) || Number(t.id) === Number(tid)
                );
                if (directTopic) {
                    addSubtopicToGroup(
                        directTopic.topic_id || directTopic.id,
                        directTopic.title || directTopic.topic_name || directTopic.name,
                        null,
                        null
                    );
                }
            }
        }

        if (localGroups.length > 0) {
            return localGroups;
        }

        // 2. Fallback to backend-resolved topic_groups
        if (Array.isArray(comment.topic_groups) && comment.topic_groups.length > 0) {
            return comment.topic_groups;
        }

        // 3. Fallback to first selected topic if target_id was re-assigned
        if (selectedTopics.length > 0) {
            const firstTopic = selectedTopics[0];
            const firstSub = Array.isArray(firstTopic.subtopics) && firstTopic.subtopics.length > 0
                ? firstTopic.subtopics[0]
                : null;
            return [{
                topic_id: firstTopic.topic_id,
                topic_title: firstTopic.title,
                subtopics: firstSub ? [{ subtopic_id: firstSub.subtopic_id, title: firstSub.title }] : []
            }];
        }

        return [];
    }, [selectedTopics, availableTopics]);

    useImperativeHandle(ref, () => ({
        validate: () => {
            if (!selectedTopics || selectedTopics.length === 0) {
                return "Please select or create at least one mapping entry.";
            }
            return null;
        },
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

            await fetchJson(`/api/topics/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    week_id: Number(iloId),
                    ilo_id: Number(iloId),
                    is_orientation: Boolean(isOrientation),
                    topics: selectedTopics
                })
            });
        },
        getCommentTargetDetails: (comment) => resolveTopicGroupsForComment(comment),
        getCommentTargetLabel: (comment) => {
            const groups = resolveTopicGroupsForComment(comment);
            if (groups.length > 0) {
                return groups
                    .map(g => g.subtopics && g.subtopics.length > 0
                        ? `${g.topic_title}: ${g.subtopics.map(s => s.title).join('; ')}`
                        : g.topic_title
                    )
                    .join(' | ');
            }
            if (comment.target_title) return comment.target_title;
            return `Topic`;
        }
    }));

    if (loading) return <div style={{padding: '20px 20px 100px 20px', color: '#666'}}>Loading Core Subjects Topology...</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <TopicSelector
                options={availableTopics}
                value={selectedTopics}
                onChange={setSelectedTopics}
                disabled={loading}
                iloId={iloId}
                courseCode={courseCode}
                weekNumber={isOrientation ? 1 : weekNumber}
                previousWeekTopics={isOrientation ? [] : previousWeekTopics}
            />
        </div>
    );
});


// ==========================================
// 2. MASTER MAP CONTENTS ORCHESTRATOR 
// ==========================================
const TopicForm = () => {
    const navigate = useNavigate();
    const { courseCode, iloId, status } = useParams();
    const [searchParams] = useSearchParams();
    const isOrientation = searchParams.get('orientation') === 'true' || searchParams.get('orientation') === '1';

    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['Topics', 'Teaching & Learning Activities', 'References'];

    // Weekly Planner & Course Outcome Context State
    const [weekContext, setWeekContext] = useState({
        co_id: null,
        pc_offering_id: null,
        revision_number: 1,
        coNumber: null,
        coDescription: '',
        ilos: [],
        weeks: [],
        courseOutcomes: [],
        commentCountsByWeek: {}
    });
    const [activeWeekId, setActiveWeekId] = useState(iloId ? Number(iloId) : null);

    // Refs for sub-forms
    const topicRef = useRef();
    const tlaRef = useRef();
    const refRef = useRef();

    // Floating Comment State logic
    const [isCommentsOpen, setIsCommentsOpen] = useState(true);

    // Track unresolved comment counts per content tab for the currently active week
    const [stepCommentCounts, setStepCommentCounts] = useState([0, 0, 0]);

    const effectiveWeekId = activeWeekId || iloId;

    const updateStepCount = useCallback((stepIdx, typeKey, count) => {
        setStepCommentCounts(prev => {
            if (prev[stepIdx] === count) return prev;
            const next = [...prev];
            next[stepIdx] = count;
            return next;
        });

        if (effectiveWeekId) {
            const wid = Number(effectiveWeekId);
            setWeekContext(prev => {
                const existingWeekCounts = prev.commentCountsByWeek[wid] || { topics: 0, tlas: 0, references: 0, total: 0 };
                if (existingWeekCounts[typeKey] === count) return prev;
                const updatedWeekCounts = {
                    ...existingWeekCounts,
                    [typeKey]: count
                };
                updatedWeekCounts.total =
                    (Number(updatedWeekCounts.topics) || 0) +
                    (Number(updatedWeekCounts.tlas) || 0) +
                    (Number(updatedWeekCounts.references) || 0);

                return {
                    ...prev,
                    commentCountsByWeek: {
                        ...prev.commentCountsByWeek,
                        [wid]: updatedWeekCounts
                    }
                };
            });
        }
    }, [effectiveWeekId]);

    const handleTopicUnresolved = useCallback((c) => updateStepCount(0, 'topics', c), [updateStepCount]);
    const handleTlaUnresolved = useCallback((c) => updateStepCount(1, 'tlas', c), [updateStepCount]);
    const handleRefUnresolved = useCallback((c) => updateStepCount(2, 'references', c), [updateStepCount]);

    const unresolvedCount = stepCommentCounts[currentStep] || 0;

    // Main Operation / Global Validations States
    const [isSaving, setIsSaving] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;

        async function loadWeekContext() {
            try {
                const orientParam = isOrientation ? 'true' : 'false';
                const ctx = await fetchJson(`/api/topics/week-context/${encodeURIComponent(iloId)}?isOrientation=${orientParam}`);
                if (!mounted || !ctx) return;

                setWeekContext({
                    co_id: ctx.co_id || null,
                    pc_offering_id: ctx.pc_offering_id || null,
                    revision_number: ctx.revision_number || 1,
                    coNumber: ctx.coNumber || 1,
                    coDescription: ctx.coDescription || '',
                    ilos: Array.isArray(ctx.ilos) ? ctx.ilos : [],
                    weeks: Array.isArray(ctx.weeks) ? ctx.weeks : [],
                    courseOutcomes: Array.isArray(ctx.courseOutcomes) ? ctx.courseOutcomes : [],
                    commentCountsByWeek: ctx.commentCountsByWeek || {}
                });

                if (ctx.activeWeekId) {
                    setActiveWeekId(Number(ctx.activeWeekId));
                }
            } catch (err) {
                console.error("Failed to load week context:", err);
                if (mounted) {
                    setActiveWeekId(Number(iloId));
                }
            }
        }

        loadWeekContext();
        return () => { mounted = false; };
    }, [iloId, isOrientation]);

    const activeWeekIndex = weekContext.weeks.findIndex(
        w => Number(w.week_id) === Number(activeWeekId)
    );
    const activeWeekNumber = activeWeekIndex >= 0
        ? (weekContext.weeks[activeWeekIndex].weekNumber || activeWeekIndex + 1)
        : 1;
    const previousWeekId = (!isOrientation && activeWeekIndex > 0)
        ? weekContext.weeks[activeWeekIndex - 1]?.week_id
        : null;

    const handleSelectWeek = async (nextWeekId) => {
        if (isOrientation || Number(nextWeekId) === Number(activeWeekId)) return;
        try {
            if (topicRef.current) await topicRef.current.save();
            if (tlaRef.current) await tlaRef.current.save();
            if (refRef.current) await refRef.current.save();
        } catch (err) {
            console.warn("Auto-saving current week before switching encountered an issue:", err);
        }
        setActiveWeekId(Number(nextWeekId));
    };

    const handleSelectCourseOutcome = async (targetCo) => {
        if (!targetCo || isOrientation || Number(targetCo.coNumber) === Number(weekContext.coNumber)) return;
        try {
            if (topicRef.current) await topicRef.current.save();
            if (tlaRef.current) await tlaRef.current.save();
            if (refRef.current) await refRef.current.save();
        } catch (err) {
            console.warn("Auto-saving current week before switching Course Outcome encountered an issue:", err);
        }

        const nextWeeks = Array.isArray(targetCo.weeks) ? targetCo.weeks : [];
        const nextWeekId = targetCo.firstWeekId || (nextWeeks[0] ? nextWeeks[0].week_id : null);

        setWeekContext(prev => ({
            ...prev,
            co_id: targetCo.co_id,
            coNumber: targetCo.coNumber,
            coDescription: targetCo.coDescription || '',
            ilos: Array.isArray(targetCo.ilos) ? targetCo.ilos : [],
            weeks: nextWeeks
        }));

        if (nextWeekId) {
            setActiveWeekId(Number(nextWeekId));
        }
    };

    const goBackHandler = () => navigate(-1);

    const getActiveRef = () => {
        if (currentStep === 0) return topicRef.current;
        if (currentStep === 1) return tlaRef.current;
        return refRef.current;
    };

    const handleSaveClick = async () => {
        const errors = {};

        // 1. Pull Validations universally from all loaded refs
        if (topicRef.current) {
            const err = topicRef.current.validate();
            if (err) errors['Topics'] = err;
        }
        if (tlaRef.current) {
            const err = tlaRef.current.validate();
            if (err) errors['TLAs'] = err;
        }
        if (refRef.current) {
            const err = refRef.current.validate();
            if (err) errors['References'] = err;
        }

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setShowValidationModal(true);
        } else {
            // Clean Save
            await executeGlobalSave();
        }
    };

    const executeGlobalSave = async () => {
        setShowValidationModal(false);
        setIsSaving(true);
        try {
            // Execute physical batch savings on rendered forms explicitly
            if (topicRef.current) await topicRef.current.save();
            if (tlaRef.current) await tlaRef.current.save();
            if (refRef.current) await refRef.current.save();

            setShowSuccessModal(true);
            setTimeout(() => {
                setShowSuccessModal(false);
                navigate(-1);
            }, 1500);

        } catch (err) {
            console.error("Consolidated save execution failed:", err);
            alert("An error occurred synchronizing architecture metadata. Review console details.");
        } finally {
            setIsSaving(false);
        }
    };

    const renderActiveCommentsList = () => {
        const activeRef = getActiveRef();
        if (!activeRef) return null;

        const comments = activeRef.getComments ? activeRef.getComments() : [];

        if (comments.length === 0) {
            return (
                <div className={styles.emptyChecklist}>
                    <p style={{textAlign: 'center', paddingTop: '40px', color: '#888'}}>
                        No unresolved notes for {steps[currentStep]}.
                    </p>
                </div>
            );
        }

        return (
            <div className={styles.checklistWrapper}>
                {comments.map((comment) => {
                    const topicGroups = (currentStep === 0 && activeRef.getCommentTargetDetails)
                        ? activeRef.getCommentTargetDetails(comment)
                        : [];

                    return (
                        <label
                            key={comment.comment_id}
                            className={`${styles.checklistItem} ${comment.resolved_status ? styles.itemResolved : ''}`}
                        >
                            <div className={styles.checkboxControl}>
                                <input
                                    type="checkbox"
                                    checked={comment.resolved_status}
                                    onChange={() => activeRef.toggleComment(comment.comment_id)}
                                />
                                <span className={styles.customCheckmark}></span>
                            </div>

                            <div className={styles.commentContent}>
                                {currentStep === 0 && topicGroups.length > 0 ? (
                                    <div className={styles.topicTargetContainer}>
                                        {topicGroups.map((group, gIdx) => (
                                            <div key={group.topic_id || gIdx} className={styles.topicTargetGroup}>
                                                <div className={styles.topicTargetParent}>
                                                    <span className={styles.topicTargetPrefix}>TOPIC:</span>
                                                    <span className={styles.topicTargetTitle}>{group.topic_title}</span>
                                                </div>
                                                {Array.isArray(group.subtopics) && group.subtopics.length > 0 && (
                                                    <div className={styles.subtopicTargetList}>
                                                        {group.subtopics.map((sub, sIdx) => (
                                                            <div key={sub.subtopic_id || sIdx} className={styles.subtopicTargetPill}>
                                                                <span className={styles.subtopicBullet}>•</span>
                                                                <span className={styles.subtopicTargetText}>{sub.title}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.targetContextBadge}>
                                        <span className={styles.targetText}>{activeRef.getCommentTargetLabel(comment)}</span>
                                    </div>
                                )}

                                <p className={styles.commentMessage}>{comment.message}</p>

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
                    );
                })}
            </div>
        );
    };

    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    {/* Weekly Content Planner Navigation Bar */}
                    <FormNavigation
                        goBack={goBackHandler}
                        onSave={handleSaveClick}
                        currentStep={currentStep}
                        setStep={setCurrentStep}
                        steps={steps}
                        weeks={weekContext.weeks}
                        activeWeekId={effectiveWeekId}
                        onSelectWeek={handleSelectWeek}
                        coNumber={weekContext.coNumber}
                        coDescription={weekContext.coDescription}
                        ilos={weekContext.ilos}
                        courseOutcomes={weekContext.courseOutcomes}
                        onSelectCourseOutcome={handleSelectCourseOutcome}
                        isOrientation={isOrientation}
                        status={status}
                        stepCommentCounts={stepCommentCounts}
                        weekCommentCounts={weekContext.commentCountsByWeek}
                    />

                    <div className={styles.mainCont} style={{ position: 'relative', flex: 1, minHeight: 0, height: 'auto' }}>

                        {/* -------------------- Sub Forms Wrapper Context -------------------- */}
                        <div className={styles.leftCont} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                             <div className={styles['form-container']} style={{ padding: '20px 20px 40px 20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: currentStep === 1 ? 'auto' : 'hidden', boxSizing: 'border-box' }}>

                                 <div style={{ display: currentStep === 0 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                     <TopicSubForm
                                         ref={topicRef}
                                         iloId={effectiveWeekId}
                                         previousWeekId={previousWeekId}
                                         weekNumber={activeWeekNumber}
                                         isOrientation={isOrientation}
                                         status={status}
                                         setUnresolvedCount={handleTopicUnresolved}
                                         courseCode={courseCode}
                                     />
                                 </div>
                                 <div style={{ display: currentStep === 1 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                     <TLAForm
                                         ref={tlaRef}
                                         iloId={effectiveWeekId}
                                         isOrientation={isOrientation}
                                         status={status}
                                         setUnresolvedCount={handleTlaUnresolved}
                                     />
                                 </div>
                                 <div style={{ display: currentStep === 2 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                     <ReferenceForm
                                         ref={refRef}
                                         iloId={effectiveWeekId}
                                         isOrientation={isOrientation}
                                         status={status}
                                         setUnresolvedCount={handleRefUnresolved}
                                     />
                                 </div>
                             </div>
                        </div>


                        {/* -------------------- Interactive Review Sidebar UX -------------------- */}
                        {status === 'returned' && (
      <div className={isCommentsOpen ? styles.rightContCollapsible : styles.rightContCollapsed}>
          {isCommentsOpen ? (
              <div className={styles.checklistCard}>
                  <div className={styles.checklistHeaderCollapsible}>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                          <MessageSquare size={18} className={styles.headerIcon} />
                          <h3 style={{fontSize: '14px', margin: 0, fontWeight: 500}}>Review Feedback</h3>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                          {unresolvedCount > 0 && <span className={styles.floatingBadge} style={{position: 'relative', top: 0, right: 0}}>{unresolvedCount}</span>}
                          <button onClick={() => setIsCommentsOpen(false)} className={styles.closeCollapse}>
                              <ChevronsRight size={20} />
                          </button>
                      </div>
                  </div>
                  {renderActiveCommentsList()}
              </div>
          ) : (
              <button
                  className={styles.sidebarToggle}
                  onClick={() => setIsCommentsOpen(true)}
                  title={`View Review Feedback for ${steps[currentStep]}`}
              >
                  <MessageSquare size={20} className={styles.headerIcon} />
                  {unresolvedCount > 0 && <span className={styles.collapsedBadge}>{unresolvedCount}</span>}
              </button>
          )}
      </div>
)}


                    </div>

                    {/* --- Validation Enforcement Core Logic Modal --- */}
                    <InlineModal
                        isOpen={showValidationModal}
                        title="Validation Warning"
                        onClose={() => setShowValidationModal(false)}
                        actions={
                            <>
                                <button className={styles.modalCancelBtn} onClick={() => setShowValidationModal(false)}>Return to Fix</button>
                                <button className={styles.modalConfirmBtn} onClick={executeGlobalSave}>Save Progress Anyway</button>
                            </>
                        }
                    >
                        <div style={{ textAlign: 'left' }}>
                            <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', color: '#c62828'}}>
                                <AlertCircle size={24} />
                                <span style={{fontWeight: 600}}>Some forms are missing required information.</span>
                            </div>
                            <ul style={{ background: '#fff5f5', padding: '15px 15px 15px 30px', borderRadius: '6px', margin: 0, fontSize: '13px', color: '#b71c1c' }}>
                                {Object.entries(validationErrors).map(([key, problem]) => (
                                    <li key={key} style={{marginBottom: '5px'}}>
                                        <strong>{key}:</strong> {problem}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </InlineModal>

                    <InlineModal
                        isOpen={isSaving || showSuccessModal}
                        title={showSuccessModal ? "Saved" : "Synchronizing"}
                        onClose={() => {}}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '20px 0' }}>
                            {showSuccessModal ? (
                                <><CheckCircle size={24} color="#10b981" /> <span>Updates formally stored!</span></>
                            ) : (
                                <><div className={styles.spinnerDark} /> <span>Executing batch save mechanics...</span></>
                            )}
                        </div>
                    </InlineModal>
                </div>
            }
        />
    );
};

export default TopicForm;
