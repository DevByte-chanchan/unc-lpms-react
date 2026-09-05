import React, { useEffect, useState, useRef, forwardRef, useImperativeHandle } from "react";
import Skeleton from "../layouts/Skeleton.jsx";
import Header from "../components/Header.jsx";
import FormNavigation from "../components/FormNavigation.jsx";
import styles from "../styles/Form.module.sass";
import { useNavigate, useParams } from "react-router-dom";
import SideNavigation from "../components/SideNavigation.jsx";
import TopicSelector from "../components/TopicSelector.jsx";
import { X, CheckCircle, MessageSquare, AlertCircle, ChevronsRight, ChevronRight, ChevronLeft } from 'react-feather';
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
const TopicSubForm = forwardRef(({ iloId, status, setUnresolvedCount, courseCode }, ref) => {
    const [availableTopics, setAvailableTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reviewComments, setReviewComments] = useState([]);

    useEffect(() => {
        if (!iloId) return;
        let mounted = true;
        setLoading(true);

        async function loadData() {
            try {
                const availableUrl = `/api/topics/available?iloId=${encodeURIComponent(iloId)}`;
                const assignedUrl = `/api/topics/assigned/${encodeURIComponent(iloId)}`;
                const commentsUrl = `/api/comments/filter/${encodeURIComponent(iloId)}/topics`;

                const pAvailable = fetchJson(availableUrl).catch(() => []);
                const pAssigned = fetchJson(assignedUrl).catch(() => []);
                const pComments = status === 'returned' ? fetchJson(commentsUrl).catch(() => []) : Promise.resolve([]);

                const [resAvailable, resAssigned, resComments] = await Promise.all([pAvailable, pAssigned, pComments]);
                if (!mounted) return;

                setAvailableTopics(Array.isArray(resAvailable) ? resAvailable : []);
                setSelectedTopics(Array.isArray(resAssigned) ? resAssigned : []);

                if (status === 'returned' && Array.isArray(resComments)) {
                    setReviewComments(resComments.map(c => ({
                        ...c,
                        resolved_status: c.resolved_status === 1 || c.resolved_status === true
                    })));
                }
            } catch (err) {
                console.error("Failed to load initial topics configurations:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadData();
        return () => { mounted = false; };
    }, [iloId, status]);

    useEffect(() => {
        if (setUnresolvedCount) {
            setUnresolvedCount(reviewComments.filter(c => !c.resolved_status).length);
        }
    }, [reviewComments, setUnresolvedCount]);

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
                    ilo_id: Number(iloId),
                    topics: selectedTopics
                })
            });
        },
        getCommentTargetLabel: (comment) => {
            if (comment.target_title) return comment.target_title;
            const match = availableTopics.find(t =>
                Number(t.topic_id) === Number(comment.target_id) || Number(t.id) === Number(comment.target_id)
            );
            return match ? (match.title || match.topic_name || match.name) : `Topic Element ID: ${comment.target_id}`;
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

    const [currentStep, setCurrentStep] = useState(0);
    const steps = ['Topics', 'Teaching & Learning Activities', 'References'];

    // Refs for sub-forms
    const topicRef = useRef();
    const tlaRef = useRef();
    const refRef = useRef();

    // Floating Comment State logic
    const [isCommentsOpen, setIsCommentsOpen] = useState(true);
    
    // We track the unresolved count for the active tab context directly via subcomponent callbacks
    const [unresolvedCount, setUnresolvedCount] = useState(0);

    // Main Operation / Global Validations States
    const [isSaving, setIsSaving] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const goBackHandler = () => navigate(-1);

    const getActiveRef = () => {
        if (currentStep === 0) return topicRef.current;
        if (currentStep === 1) return tlaRef.current;
        // else
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
                {comments.map((comment) => (
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
                            <div className={styles.targetContextBadge}>
                                <span className={styles.targetText}>{activeRef.getCommentTargetLabel(comment)}</span>
                            </div>

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
                ))}
            </div>
        );
    };

    return (
        <Skeleton
            header={<Header role={'Instructor'} name={'NORTON, MONICA'} />}
            nav={<SideNavigation />}
            content={
                <div className={styles.container}>
                    {/* Centered Progressive Form Navigation UI Component */}
                    <FormNavigation 
                        goBack={goBackHandler} 
                        onSave={handleSaveClick}
                        currentStep={currentStep}
                        setStep={setCurrentStep}
                        steps={steps}
                    />

                    <div className={styles.mainCont} style={{ position: 'relative', flex: 1, minHeight: 0, height: 'auto' }}>
                        
                        {/* -------------------- Sub Forms Wrapper Context -------------------- */}
                        <div className={styles.leftCont} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                             <div className={styles['form-container']} style={{ padding: '20px 20px 40px 20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: currentStep === 1 ? 'auto' : 'hidden', boxSizing: 'border-box' }}>
                                 

                                 <div style={{ display: currentStep === 0 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                     <TopicSubForm ref={topicRef} iloId={iloId} status={status} setUnresolvedCount={currentStep === 0 ? setUnresolvedCount : null} courseCode={courseCode} />
                                 </div>
                                 <div style={{ display: currentStep === 1 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                     <TLAForm ref={tlaRef} iloId={iloId} status={status} setUnresolvedCount={currentStep === 1 ? setUnresolvedCount : null} />
                                 </div>
                                 <div style={{ display: currentStep === 2 ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                     <ReferenceForm ref={refRef} iloId={iloId} status={status} setUnresolvedCount={currentStep === 2 ? setUnresolvedCount : null} />
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
