import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft, Loader, Trash2} from 'react-feather';
import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useSearchParams, useLocation, useParams} from "react-router-dom";
import layout from "../styles/TosSections.module.sass";
import previewLayout from "../styles/TOSPreview.module.sass";
import TOSPreview from "../pages/TosPreview.jsx";
import TOSSummary from "../pages/TosSummary.jsx";
import QuestionCognitiveMapping, { AutoResizeTextarea } from "../pages/QuestionCognitiveMapping.jsx";
import BuilderNavigation from "../components/BuilderNavigation.jsx";
import { fetchOutcomes, fetchItems, saveOutcomes, saveItems, fetchCourse, updateCourse, updateStatus, fetchComments, createComment, deleteComment } from '../services/api.js';

const TosSections = ({status, role = 'instructor'}) => {

    const [questions, setQuestions] = useState([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [assessmentMode] = useState("question");
    const [rubricCategories, setRubricCategories] = useState([]);
    const [expandedCOs, setExpandedCOs] = useState(new Set());
    const [expandedILOs, setExpandedILOs] = useState(new Set());
    const [viewMode, setViewMode] = useState('normal');
    const [lastClickedItemId, setLastClickedItemId] = useState(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isProgramHead = role === 'program-head';
    const [phSection, setPhSection] = useState('Table of Specifications Report');
    const defaultSection = isProgramHead ? 'Table of Specifications Report' : 'Outcome Overview';
    const selectedSection = isProgramHead ? phSection : (searchParams.get('section') || defaultSection);
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
                { id: "ILO3", description: "Structure information architecture effectively using card sorting techniques.", hours: 6, percentage: 50, items: 10 }
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
    const [effectiveStatus, setEffectiveStatus] = useState(location.state?.tosStatus || 'draft');
    const readOnly = !isProgramHead && (effectiveStatus === 'pending' || effectiveStatus === 'approved');
    const courseName = location.state?.courseName || '';
    const fromExamType = location.state?.examType || 'Midterm';
    const fromSchoolYear = location.state?.schoolYear || String(new Date().getFullYear());
    const fromSemester = location.state?.semester || '1st Semester';
    const [courseNameState, setCourseName] = useState(courseName);
    const [assessmentName, setAssessmentName] = useState('');
    const defaultRows = getDefaultOutlines();

    const [rows, setRows] = useState(defaultRows);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [tosErrors, setTosErrors] = useState([]);
    const [showTosErrorModal, setShowTosErrorModal] = useState(false);
    const [errorFields, setErrorFields] = useState({});
    const [exportErrors, setExportErrors] = useState({ outcomeOverview: [], assessmentMapping: [], tosSummary: [] });
    const [showExportErrorModal, setShowExportErrorModal] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const submitGuardRef = useRef(false);

    useEffect(() => {
        if (!courseCode || dataLoaded) return;
        setDataLoaded(true);

        fetchCourse(courseCode).then(course => {
            if (course?.name && !courseNameState) setCourseName(course.name);
            if (course?.assessmentName) setAssessmentName(course.assessmentName);
            if (course?.tosStatus?.status) setEffectiveStatus(course.tosStatus.status);
        }).catch(() => {});

        fetchOutcomes(courseCode).then(data => {
            if (!data) return;
            const mapped = data.map(o => ({
                co: o.co,
                description: o.description || '',
                totalHours: (o.ilos || []).reduce((s, i) => s + (i.hours || 0), 0),
                totalPercentage: (o.ilos || []).reduce((s, i) => s + (i.percentage || 0), 0),
                totalItems: (o.ilos || []).reduce((s, i) => s + (i.items || 0), 0),
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
        fetchComments(courseCode).then(data => {
            if (data && data.length) {
                setComments(data.map(c => ({
                    id: c.id,
                    scope: { co: c.co, ilo: c.ilo, cognitiveLevel: c.cognitiveLevel, itemNumber: c.itemNumber },
                    type: c.type,
                    body: c.body,
                    timestamp: new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' ' + new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                })));
            }
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

    const toggleCO = (co) => {
        setExpandedCOs(prev => {
            const next = new Set(prev);
            if (next.has(co)) next.delete(co); else next.add(co);
            return next;
        });
    };

    const toggleILO = (key) => {
        setExpandedILOs(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    useEffect(() => {
        if (viewMode === 'group' && questions.length > 0) {
            setExpandedCOs(new Set(questions.map(q => q.co).filter(Boolean)));
            setExpandedILOs(new Set(questions.filter(q => q.co && q.ilo).map(q => `${q.co}|${q.ilo}`)));
        }
    }, [viewMode, questions]);

    useEffect(() => {
        if (!lastClickedItemId) return;
        const timer = setTimeout(() => {
            const el = document.querySelector(`[data-item-id="${lastClickedItemId}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return () => clearTimeout(timer);
    }, [viewMode, lastClickedItemId]);

    const handleSectionChange = (e) => {
        if (!confirmDiscard()) return;
        setAddingComment(false);
        setActiveScope(null);
        setCommentBody('');
        if (isProgramHead) {
            setPhSection(e.target.value);
        } else {
            setSearchParams({ section: e.target.value });
        }
    };

    const [isLoading, setIsLoading] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);
    const [builderLoading, setBuilderLoading] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const [builderFilledCount, setBuilderFilledCount] = useState(0);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [builderKey, setBuilderKey] = useState(0);
    const builderSaveRef = useRef(null);
    const [showComment, setShowComment] = useState(false);
    const commentRef = useRef(null);
    const commentBtnRef = useRef(null);
    const commentBodyRef = useRef(null);

    const confirmDiscard = () => !commentBody.trim() || window.confirm('Discard this comment?');

    const closeCommentPanel = () => {
        if (!confirmDiscard()) return;
        setAddingComment(false);
        setActiveScope(null);
        setCommentBody('');
        setShowComment(false);
    };

    const toggleCommentPanel = () => {
        if (showComment) { closeCommentPanel(); return; }
        setShowComment(true);
    };
    const [comments, setComments] = useState([]);
    const [addingComment, setAddingComment] = useState(false);
    const [activeScope, setActiveScope] = useState(null);
    const [commentType, setCommentType] = useState('Item count');
    const [commentBody, setCommentBody] = useState('');
    const [scrolledPastForm, setScrolledPastForm] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const [showApproveCountdown, setShowApproveCountdown] = useState(false);
    const [showReturnCountdown, setShowReturnCountdown] = useState(false);
    const [approveCountdown, setApproveCountdown] = useState(5);
    const [returnCountdown, setReturnCountdown] = useState(5);
    const approveTimerRef = useRef(null);
    const returnTimerRef = useRef(null);

    const handleCommentScroll = useCallback(() => {
        if (commentBodyRef.current) {
            setScrolledPastForm(commentBodyRef.current.scrollTop > 450);
        }
    }, []);

    useEffect(() => {
        const el = commentBodyRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleCommentScroll);
        return () => el.removeEventListener('scroll', handleCommentScroll);
    }, [handleCommentScroll, showComment]);

    const scrollToForm = () => {
        if (commentBodyRef.current) {
            commentBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const isActiveCell = useCallback((co, ilo, cognitiveLevel, itemNumber) => {
        if (!activeScope) return false;
        return activeScope.co === co && activeScope.ilo === ilo && activeScope.cognitiveLevel === cognitiveLevel && (activeScope.itemNumber || null) === (itemNumber || null);
    }, [activeScope]);

    const handleCellClick = (co, ilo, cognitiveLevel, itemNumber) => {
        if (!addingComment) return;
        setActiveScope({ co: co || '\u2014', ilo: ilo || '\u2014', cognitiveLevel: cognitiveLevel || '\u2014', itemNumber });
        setCommentType(itemNumber ? 'Question' : 'Item count');
        setCommentBody('');
    };

    const handleAddComment = async () => {
        if (!activeScope || !commentBody.trim()) return;
        try {
            const saved = await createComment(courseCode, {
                co: activeScope.co === '\u2014' ? '' : activeScope.co,
                ilo: activeScope.ilo === '\u2014' ? '' : activeScope.ilo,
                cognitiveLevel: activeScope.cognitiveLevel === '\u2014' ? '' : activeScope.cognitiveLevel,
                itemNumber: activeScope.itemNumber || '',
                type: commentType,
                body: commentBody.trim()
            });
            setComments(prev => [...prev, {
                id: saved.id,
                scope: { ...activeScope },
                type: commentType,
                body: commentBody.trim(),
                timestamp: `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
            }]);
        } catch (err) {
            console.error('Failed to save comment:', err);
        }
        setActiveScope(null);
        setAddingComment(false);
        setCommentBody('');
    };

    const handleDeleteComment = async (id) => {
        try {
            await deleteComment(courseCode, id);
            setComments(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    const handleCancelComment = () => {
        if (!confirmDiscard()) return;
        setActiveScope(null);
        setAddingComment(false);
        setCommentBody('');
    };

    useEffect(() => {
        if (!showComment) {
            setAddingComment(false);
            setActiveScope(null);
            setCommentBody('');
        }
    }, [showComment]);

    useEffect(() => {
        if ((addingComment || activeScope) && commentBodyRef.current) {
            commentBodyRef.current.scrollTop = 0;
            setScrolledPastForm(false);
        }
    }, [addingComment, activeScope]);

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

    const cognitiveLevels = [
        'Remembering', 'Understanding', 'Applying',
        'Analyzing', 'Evaluating', 'Creating'
    ];

    const getAggregatedData = () => {
        const data = {};
        rows.forEach(co => {
            data[co.co] = {};
            co.ilos.forEach(ilo => {
                data[co.co][ilo.id] = {};
                cognitiveLevels.forEach(level => { data[co.co][ilo.id][level] = []; });
            });
        });
        questions.forEach(q => {
            if (q.co && q.ilo && q.cognitiveLevel && q.points && data[q.co] && data[q.co][q.ilo]) {
                data[q.co][q.ilo][q.cognitiveLevel].push({ span: q.span || 1, points: Number(q.points) });
            }
        });
        return data;
    };

    const handleNavigateBack = async () => {
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
            try {
                await Promise.allSettled([
                    saveOutcomes(courseCode, outcomesPayload),
                    saveItems(courseCode, questions),
                    updateCourse(courseCode, { assessmentName })
                ]);
            } catch (err) {
                console.error('Save failed:', err);
            }
        }
        navigate('/assignedtos', { state: { initialStatus: effectiveStatus } });
    };

    const handleStartApprove = () => {
        setShowApproveConfirm(true);
    };

    const handleStartReturn = () => {
        setShowReturnConfirm(true);
    };

    const handleConfirmApprove = () => {
        setShowApproveConfirm(false);
        setShowApproveCountdown(true);
        setApproveCountdown(5);
    };

    const handleConfirmReturn = () => {
        setShowReturnConfirm(false);
        setShowReturnCountdown(true);
        setReturnCountdown(5);
    };

    const handleApprove = async () => {
        if (courseCode) {
            await updateStatus(courseCode, 'approved');
            navigate('/role/program-head/tos', { state: { tosStatusUpdate: { courseCode, newStatus: 'approved' } } });
        }
    };

    const handleReturn = async () => {
        if (courseCode) {
            await updateStatus(courseCode, 'returned');
            navigate('/role/program-head/tos', { state: { tosStatusUpdate: { courseCode, newStatus: 'returned' } } });
        }
    };

    useEffect(() => {
        if (!showApproveCountdown) return;
        if (approveCountdown === 0) {
            setShowApproveCountdown(false);
            handleApprove();
            return;
        }
        approveTimerRef.current = setTimeout(() => setApproveCountdown(c => c - 1), 1000);
        return () => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); };
    }, [showApproveCountdown, approveCountdown]);

    useEffect(() => {
        if (!showReturnCountdown) return;
        if (returnCountdown === 0) {
            setShowReturnCountdown(false);
            handleReturn();
            return;
        }
        returnTimerRef.current = setTimeout(() => setReturnCountdown(c => c - 1), 1000);
        return () => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); };
    }, [showReturnCountdown, returnCountdown]);

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
                        tosStatus={effectiveStatus}
                        readOnly={readOnly}
                    />
                ) : (
                    <div className={styles.navi}>
                        <div className={styles.return} onClick={() => {
                            if (isProgramHead) {
                                navigate('/role/program-head/tos', { state: { initialStatus: effectiveStatus } });
                            } else if (readOnly) {
                                navigate('/assignedtos', { state: { initialStatus: effectiveStatus } });
                            } else {
                                handleNavigateBack();
                            }
                        }}>
                            <ChevronLeft size={22}/>
                        </div>

                        <div className={styles['section-select']}>
                            <select value={selectedSection} onChange={handleSectionChange}>
                                {isProgramHead ? (
                                    <>
                                        <option value="Table of Specifications Report">Table of Specifications Report</option>
                                        <option value="Assessment Items">Assessment Items</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Outcome Overview">Outcome Overview</option>
                                        <option value="Assessment Item-Cognitive Level Alignment">Assessment Item-Cognitive Level Alignment</option>
                                        <option value="TOS Summary">TOS Summary</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {isProgramHead ? (
                            <>
                                <div ref={commentBtnRef} className={`${styles.draft} ${layout.commentBtn} ${showComment ? layout.commentBtnActive : ''}`} onClick={toggleCommentPanel}>
                                    Add Comment
                                </div>
                                <button className={styles.submit} onClick={handleStartApprove}>
                                    Approve
                                </button>
                            </>
                        ) : readOnly ? (
                            <span className={styles.draft} style={{ color: '#999', cursor: 'default' }}>View Only</span>
                        ) : (
                        <>
                        <div className={styles.draft} onClick={handleNavigateBack}>
                            Save as Draft
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button
                                className={`${styles.submit} ${!canSubmit ? styles.submitDisabled : ''}`}
                                disabled={!canSubmit}
                                    onClick={() => {
                                        if (submitGuardRef.current || submitLoading) return;
                                        submitGuardRef.current = true;
                                        const { errors, fieldKeys } = validateTOS();
                                        setErrorFields(fieldKeys);
                                        const hasErrors = errors.outcomeOverview.length > 0 || errors.assessmentMapping.length > 0 || errors.tosSummary.length > 0;
                                        if (hasErrors) {
                                            submitGuardRef.current = false;
                                            setExportErrors(errors);
                                            setShowExportErrorModal(true);
                                        } else if (courseCode) {
                                            setSubmitLoading(true);
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
                                            Promise.allSettled([
                                                saveOutcomes(courseCode, outcomesPayload),
                                                saveItems(courseCode, questions),
                                                updateCourse(courseCode, { assessmentName })
                                            ]).then(() => { setSubmitLoading(false); submitGuardRef.current = false; setIsPreviewOpen(true); }).catch(() => { setSubmitLoading(false); submitGuardRef.current = false; setIsPreviewOpen(true); });
                                        } else {
                                            submitGuardRef.current = false;
                                            setIsPreviewOpen(true);
                                        }
                                    }}
                            >
                                {submitLoading ? <Loader size={16} className={layout.spinner} /> : null}
                                {submitLoading ? 'Submitting…' : 'Submit'}
                            </button>
                            <span className={styles.submitTooltip}>Disabled due to incomplete assessment items</span>
                        </div>
                        </>
                        )}
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
                    ) : isProgramHead ? (
                        <div className={layout.panelLayout}>
                            <div className={layout.panelMain}>
                                {selectedSection === 'Table of Specifications Report' && (
                                <section>
                                    {(() => {
                                        const aggregatedData = getAggregatedData();
                                        const totalHours = rows.reduce((sum, co) => sum + (co.totalHours || 0), 0);
                                        const totalPercentage = Math.min(rows.reduce((sum, co) => sum + (co.totalPercentage || 0), 0), 100);
                                        const totalItems = rows.reduce((sum, co) => sum + (co.totalItems || 0), 0);
                                        const totalCognitive = cognitiveLevels.map(level => {
                                            return rows.reduce((sum, co) => {
                                                return sum + co.ilos.reduce((iloSum, ilo) => {
                                                    const items = aggregatedData[co.co][ilo.id][level];
                                                    return iloSum + items.reduce((s, item) => s + item.points, 0);
                                                }, 0);
                                            }, 0);
                                        });
                                        return (
                                            <div className={previewLayout.tableWrapper}>
                                                <div className={previewLayout.headerFields} style={{ marginBottom: 30 }}>
                                                    <div className={previewLayout.topRow}>
                                                        <label>Course:</label>
                                                        <input type="text" disabled className={previewLayout.numberInput} value={courseCode && courseName ? `${courseCode} - ${courseName}` : (courseCode || courseName)} />
                                                        <label>Type:</label>
                                                        <input type="text" disabled className={previewLayout.numberInput} value={fromExamType || assessmentName || 'Midterm'} />
                                                    </div>
                                                    <div className={previewLayout.bottomRow}>
                                                        <label>Semester:</label>
                                                        <input type="text" disabled className={previewLayout.numberInput} value={fromSemester} />
                                                        <label>School Year:</label>
                                                        <input type="text" disabled className={previewLayout.numberInput} value={`${fromSchoolYear} - ${Number(fromSchoolYear) + 1}`} />
                                                    </div>
                                                </div>
                                                <table className={`${previewLayout.qctable} ${previewLayout.TOSTable}`}>
                                                    <thead>
                                                    <tr>
                                                        <th rowSpan={2} className={previewLayout.headerCell}>COs & ILOs</th>
                                                        <th rowSpan={2} className={previewLayout.headerCell}>No. of Hours</th>
                                                        <th rowSpan={2} className={previewLayout.headerCell}>%</th>
                                                        <th rowSpan={2} className={previewLayout.headerCell}>No. of Items</th>
                                                        <th colSpan={6} className={previewLayout.headerCell}>Cognitive Levels</th>
                                                    </tr>
                                                    <tr className={previewLayout['sub-column']}>
                                                        {cognitiveLevels.map(level => (
                                                            <th key={level} className={previewLayout.lighten}>{level}</th>
                                                        ))}
                                                    </tr>
                                                    </thead>
                                                    <tbody>
                                                    {rows.map(co => (
                                                        <React.Fragment key={co.co}>
                                                            <tr style={{ background: '#F9FAFB', height: '50px' }}>
                                                                <td><div className={previewLayout.cellBox} style={{ fontWeight: 'bold' }}>{co.co}</div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalHours || 0}</div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalPercentage || 0}</div></td>
                                                                 <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, '\u2014', 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : ''}`} onClick={addingComment ? () => handleCellClick(co.co, '\u2014', 'Number of Items') : undefined}><div className={previewLayout.cellBox}>{co.totalItems || 0}</div></td>
                                                                  {cognitiveLevels.map(level => (
                                                                     <td key={level} style={{ background: 'white' }}></td>
                                                                 ))}
                                                             </tr>
                                                             {co.ilos.map(ilo => (
                                                                 <tr key={ilo.id}>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.id}</div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.hours || 0}</div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.percentage || 0}</div></td>
                                                                      <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : ''}`} onClick={addingComment ? () => handleCellClick(co.co, ilo.id, 'Number of Items') : undefined}><div className={previewLayout.cellBox}>{ilo.items || 0}</div></td>
                                                                     {cognitiveLevels.map(level => {
                                                                         const items = aggregatedData[co.co][ilo.id][level];
                                                                         return (
                                                                              <td key={level} className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, level) ? ` ${layout.cellActiveTable}` : ''}` : ''}`} onClick={addingComment ? () => handleCellClick(co.co, ilo.id, level) : undefined}>
                                                                                 <div className={previewLayout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
                                                                                     {items.length === 0 ? '\u2014' : items.map((item, i) => (
                                                                                         <span key={i}>{item.span} x {item.points}</span>
                                                                                     ))}
                                                                                 </div>
                                                                             </td>
                                                                         );
                                                                     })}
                                                                 </tr>
                                                             ))}
                                                         </React.Fragment>
                                                     ))}
                                                     <tr style={{ background: '#F9FAFB', height: '50px', fontWeight: '500' }}>
                                                         <td><div className={previewLayout.cellBox}>Total</div></td>
                                                         <td><div className={previewLayout.cellBox}>{totalHours}</div></td>
                                                         <td><div className={previewLayout.cellBox}>{totalPercentage}</div></td>
                                                          <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell('Total', '\u2014', 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : ''}`} onClick={addingComment ? () => handleCellClick('Total', '\u2014', 'Number of Items') : undefined}><div className={previewLayout.cellBox}>{totalItems}</div></td>
                                                         {totalCognitive.map((total, index) => (
                                                              <td key={index} className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell('Total', '\u2014', cognitiveLevels[index]) ? ` ${layout.cellActiveTable}` : ''}` : ''}`} onClick={addingComment ? () => handleCellClick('Total', '\u2014', cognitiveLevels[index]) : undefined}><div className={previewLayout.cellBox}>{total}</div></td>
                                                         ))}
                                                     </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        );
                                    })()}
                                </section>
                            )}
                            {selectedSection === 'Assessment Items' && (
                                <section>
                                    <div className={`${previewLayout.assessmentBody} ${previewLayout.tabContent}`}>
                                        <div className={layout.viewToggleRow}>
                                            <span className={layout.assessmentLabel}>Assessment: {assessmentName || 'Midterm'}</span>
                                            <div className={layout.viewToggleGroup}>
                                                <button className={`${layout.viewToggleBtn} ${viewMode === 'normal' ? layout.viewToggleActive : ''}`} onClick={() => setViewMode('normal')}>List</button>
                                                <button className={`${layout.viewToggleBtn} ${viewMode === 'group' ? layout.viewToggleActive : ''}`} onClick={() => setViewMode('group')}>Grouped</button>
                                            </div>
                                        </div>
                                        <div className={previewLayout.assessmentList}>
                                            {(() => {
                                                if (questions.length === 0) return (
                                                    <div className={previewLayout.emptyState}>
                                                        <div className={previewLayout.emptyIcon}>
                                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                                <polyline points="14 2 14 8 20 8"/>
                                                                <line x1="16" y1="13" x2="8" y2="13"/>
                                                                <line x1="16" y1="17" x2="8" y2="17"/>
                                                                <polyline points="10 9 9 9 8 9"/>
                                                            </svg>
                                                        </div>
                                                        <p className={previewLayout.emptyText}>No assessment items yet</p>
                                                    </div>
                                                );
                                                const grouped = {};
                                                questions.forEach(q => {
                                                    const co = q.co || 'Uncategorized';
                                                    const ilo = q.ilo || 'Uncategorized';
                                                    const cog = q.cognitiveLevel || 'Uncategorized';
                                                    if (!grouped[co]) grouped[co] = {};
                                                    if (!grouped[co][ilo]) grouped[co][ilo] = {};
                                                    if (!grouped[co][ilo][cog]) grouped[co][ilo][cog] = [];
                                                    grouped[co][ilo][cog].push(q);
                                                });
                                                let numCounter = 0;
                                                const numMap = {};
                                                questions.forEach(q => {
                                                    numMap[q.id] = numCounter + 1;
                                                    numCounter += (q.span || 1);
                                                });
                                                const renderItem = (q) => {
                                                    const start = numMap[q.id];
                                                    const end = start + (q.span || 1) - 1;
                                                    const label = start === end ? String(start) : `${start}\u2013${end}`;
                                                    const hasRubric = q.rubricRows && q.rubricRows.length > 0;
                                                    return (
                                                        <div key={q.id} data-item-id={q.id} className={`${previewLayout.assessmentItem} ${layout.assessmentCard}${addingComment ? ` ${layout.cellSelectable}${isActiveCell(q.co, q.ilo, q.cognitiveLevel, label) ? ` ${layout.cellActive}` : ''}` : ''}`} onClick={addingComment ? () => { setLastClickedItemId(q.id); handleCellClick(q.co, q.ilo, q.cognitiveLevel, label); } : undefined}>
                                                            <div className={previewLayout.assessmentQuestion}>
                                                                <span className={previewLayout.questionNumber}>{label}.</span>
                                                                <span className={previewLayout.questionText}>{q.question || '(no question)'}</span>
                                                            </div>
                                                            {q.choices && q.choices.length > 0 && (
                                                                <div className={`${previewLayout.assessmentChoices} ${q.choices.length % 2 === 0 && q.choices.every(c => (c.text || '').length < 30) ? previewLayout.choicesGrid : ''}`}>
                                                                    {q.choices.map((choice, ci) => (
                                                                        <div key={choice.id || ci} className={previewLayout.choiceRow}>
                                                                            <span className={previewLayout.choiceLetter}>{String.fromCharCode(65 + ci)}.</span>
                                                                            <span className={previewLayout.choiceText}>{choice.text || ''}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {hasRubric && (
                                                                <div className={previewLayout.rubricBox}>
                                                                    <div className={previewLayout.rubricHeader}>
                                                                        <span className={previewLayout.rubricLabel}>Rubrics</span>
                                                                    </div>
                                                                    <div className={previewLayout.rubricTable}>
                                                                        <div className={`${previewLayout.rubricRow} ${previewLayout.rubricHeaderRow}`}>
                                                                            <span className={previewLayout.rubricName}>Criteria</span>
                                                                            <span className={previewLayout.rubricDesc}>Description</span>
                                                                            <span className={previewLayout.rubricWeight}>Weight</span>
                                                                            <span className={previewLayout.rubricPts}>Pts</span>
                                                                        </div>
                                                                        {(() => {
                                                                            const totalPts = Number(q.points) || 0;
                                                                            const rawPts = q.rubricRows.map((r) => Math.round((totalPts * Number(r.weight || 0)) / 100));
                                                                            const sumOthers = rawPts.slice(0, -1).reduce((s, v) => s + v, 0);
                                                                            const rowPts = [...rawPts.slice(0, -1), Math.max(0, totalPts - sumOthers)];
                                                                            const totalW = q.rubricRows.reduce((s, r) => s + Number(r.weight || 0), 0);
                                                                            return (
                                                                                <>
                                                                                    {q.rubricRows.map((row, ri) => (
                                                                                        <div key={row.id || ri} className={previewLayout.rubricRow}>
                                                                                            <span className={previewLayout.rubricName}>{row.name || ''}</span>
                                                                                            <span className={previewLayout.rubricDesc}>{row.description || ''}</span>
                                                                                            <span className={previewLayout.rubricWeight}>{Math.round(Number(row.weight) || 0)}%</span>
                                                                                            <span className={previewLayout.rubricPts}>{rowPts[ri]}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                    <div className={`${previewLayout.rubricRow} ${previewLayout.rubricTotalRow}`}>
                                                                                        <span className={previewLayout.rubricName}><strong>Total</strong></span>
                                                                                        <span className={previewLayout.rubricDesc}></span>
                                                                                        <span className={previewLayout.rubricWeight}>{Math.round(totalW)}%</span>
                                                                                        <span className={previewLayout.rubricPts}><strong>{totalPts}</strong></span>
                                                                                    </div>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                };
                                                return viewMode === 'normal' ? (
                                                    questions.map(q => renderItem(q))
                                                ) : (
                                                    Object.entries(grouped).map(([co, ilos]) => (
                                                        <div key={co} className={layout.coGroup}>
                                                            <div className={layout.coHeader} onClick={() => toggleCO(co)}>
                                                                <span className={layout.accordionArrow}>{expandedCOs.has(co) ? '\u25BE' : '\u25B8'}</span>
                                                                <span className={layout.coTitle}>{co}</span>
                                                            </div>
                                                            {expandedCOs.has(co) && Object.entries(ilos).map(([ilo, cogs]) => (
                                                                <div key={ilo} className={layout.iloGroup}>
                                                                    <div className={layout.iloHeader} onClick={() => toggleILO(`${co}|${ilo}`)}>
                                                                        <span className={layout.accordionArrow}>{expandedILOs.has(`${co}|${ilo}`) ? '\u25BE' : '\u25B8'}</span>
                                                                        <span className={layout.iloTitle}>{ilo}</span>
                                                                    </div>
                                                                    {expandedILOs.has(`${co}|${ilo}`) && Object.entries(cogs).map(([cog, items]) => (
                                                                        <div key={cog} className={layout.cogGroup}>
                                                                            <div className={layout.cogHeader}>{cog}</div>
                                                                            {items.map(renderItem)}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </section>
                            )}
                            </div>
                            {showComment && <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <span className={layout.commentPanelTitle}>Comments</span>
                                    <span style={{ cursor: 'pointer', fontSize: 18, lineHeight: 1, color: '#888', userSelect: 'none' }} onClick={closeCommentPanel}>&times;</span>
                                </div>
                                <div ref={commentBodyRef} className={layout.commentPanelBody}>
                                    {addingComment && activeScope && scrolledPastForm && (
                                        <div className={layout.scrollToFormBtn} onClick={scrollToForm}>
                                            ↑ Back to comment form
                                        </div>
                                    )}
                                    {addingComment && activeScope ? (
                                        <div className={layout.commentFormCard}>
                                            <div className={layout.commentScope}>Commenting on {activeScope.co}{activeScope.ilo !== '—' ? ` → ${activeScope.ilo}` : ''} → {activeScope.cognitiveLevel}{activeScope.itemNumber ? ` → Item ${activeScope.itemNumber}` : ''}</div>
                                            {activeScope.ilo !== '—' && !activeScope.itemNumber && (
                                            <select className={layout.commentTypeSelect} value={commentType} onChange={e => setCommentType(e.target.value)}>
                                                <option value="Item count">Item count</option>
                                                <option value="Cognitive level">Cognitive level</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            )}
                                            {activeScope.itemNumber && (
                                            <select className={layout.commentTypeSelect} value={commentType} onChange={e => setCommentType(e.target.value)}>
                                                <option value="Question">Question</option>
                                                <option value="Choices">Choices</option>
                                                <option value="Rubrics">Rubrics</option>
                                            </select>
                                            )}
                                            <AutoResizeTextarea className={layout.commentTextarea} value={commentBody} onChange={e => setCommentBody(e.target.value)} placeholder="Type your comment..." rows={1} />
                                            <div className={layout.commentFormActions}>
                                                <button className={layout.commentCancelBtn} onClick={handleCancelComment}>Cancel</button>
                                                <button className={layout.commentAddBtn} disabled={!commentBody.trim()} onClick={handleAddComment}>Add Comment</button>
                                            </div>
                                        </div>
                                    ) : addingComment ? (
                                        <div className={layout.commentFormCard}>
                                            <div className={layout.selectionCard} style={{ marginBottom: 0 }}>
                                                <div className={layout.selectionPrompt}>Select a cell to comment on...</div>
                                                <button className={layout.selectionCancel} onClick={handleCancelComment}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button className={layout.addCommentBtn} onClick={() => setAddingComment(true)}>
                                            + New Comment
                                        </button>
                                    )}
                                    {addingComment && comments.length > 0 && (
                                        <div className={layout.commentSectionLabel}>Other open comments ({comments.length})</div>
                                    )}
                                    {comments.length === 0 && !addingComment && (
                                        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments yet</div>
                                    )}
                                    {comments.map(c => (
                                        <div key={c.id} className={`${layout.commentCard}${addingComment ? ` ${layout.commentCardDimmed}` : ''}`}>
                                            <div className={layout.commentCardHeader}>
                                                <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                <Trash2 size={14} className={layout.commentDeleteBtn} onClick={() => handleDeleteComment(c.id)} />
                                            </div>
                                            {c.scope.ilo !== '—' && <div className={layout.commentCardType}>{c.type}</div>}
                                            <div className={layout.commentCardBody}>{c.body}</div>
                                            <div className={layout.commentCardTime}>{c.timestamp}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className={layout.commentPanelFooter}>
                                    <button className={layout.commentReturnBtn} disabled={comments.length === 0} onClick={handleStartReturn}>Return</button>
                                </div>
                            </div>}
                        </div>
                        )
                    : (
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
                                                                 readOnly={readOnly}
                                                                 value={co.totalItems}
                                                                 onChange={(e) => handleTotalItemsChange(coIndex, e.target.value)}
                                                                 onKeyDown={(e) => {
                                                                     if (readOnly) return;
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
                                                                 readOnly={readOnly}
                                                                 value={ilo.items}
                                                                 onChange={(e) => handleItemsChange(coIndex, iloIndex, e.target.value)}
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
                                        assessmentName={assessmentName}
                                        onAssessmentNameChange={setAssessmentName}
                                        readOnly={readOnly}
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
                courseName={courseNameState}
                courseCode={courseCode}
                assessmentName={assessmentName}
                examType={fromExamType}
                semester={fromSemester}
                schoolYear={`${fromSchoolYear} - ${Number(fromSchoolYear) + 1}`}
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

            {showApproveConfirm && (
                <div className={layout.modalOverlay} onClick={() => setShowApproveConfirm(false)}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Approve TOS</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => setShowApproveConfirm(false)}>×</span>
                        </div>
                        <div className={layout.modalBody}>
                            {comments.length > 0 ? (
                                <p style={{ color: "#555" }}>Comments will be discarded. Proceed to approval?</p>
                            ) : (
                                <p style={{ color: "#555" }}>Approve this TOS?</p>
                            )}
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} onClick={() => setShowApproveConfirm(false)}>Cancel</button>
                            <button className={layout.confirmBtn} onClick={handleConfirmApprove}>
                                {comments.length > 0 ? 'Proceed to approval' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showApproveCountdown && (
                <div className={layout.modalOverlay} onClick={() => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); setShowApproveCountdown(false); }}>
                    <div className={previewLayout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={previewLayout.confirmTextRow}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19282C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <p className={previewLayout.confirmText}>{comments.length > 0 ? 'Approving TOS — comments will be discarded' : 'Approving TOS'}</p>
                        </div>
                        <div className={previewLayout.spinner} />
                        <span className={previewLayout.countdown}>{approveCountdown}s</span>
                        <button className={previewLayout.undoBtn} onClick={() => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); setShowApproveCountdown(false); }}>Undo</button>
                    </div>
                </div>
            )}

            {showReturnConfirm && (
                <div className={layout.modalOverlay} onClick={() => setShowReturnConfirm(false)}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Return TOS</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => setShowReturnConfirm(false)}>×</span>
                        </div>
                        <div className={layout.modalBody}>
                            <p style={{ color: "#555" }}>Return this TOS with comments?</p>
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} onClick={() => setShowReturnConfirm(false)}>Cancel</button>
                            <button className={layout.confirmBtn} onClick={handleConfirmReturn}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReturnCountdown && (
                <div className={layout.modalOverlay} onClick={() => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); setShowReturnCountdown(false); }}>
                    <div className={previewLayout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={previewLayout.confirmTextRow}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19282C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <p className={previewLayout.confirmText}>Returning TOS with comments</p>
                        </div>
                        <div className={previewLayout.spinner} />
                        <span className={previewLayout.countdown}>{returnCountdown}s</span>
                        <button className={previewLayout.undoBtn} onClick={() => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); setShowReturnCountdown(false); }}>Undo</button>
                    </div>
                </div>
            )}
        </>
    );
};

export default TosSections;