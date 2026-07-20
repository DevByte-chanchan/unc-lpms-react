import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft, ChevronUp, Loader, Trash2, CheckCircle, RotateCcw, Download, Clock} from 'react-feather';
import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useSearchParams, useLocation, useParams} from "react-router-dom";
import layout from "../styles/TosSections.module.sass";
import previewLayout from "../styles/TOSPreview.module.sass";
import TOSPreview from "../pages/TosPreview.jsx";
import TOSSummary from "../pages/TosSummary.jsx";
import QuestionCognitiveMapping, { AutoResizeTextarea } from "../pages/QuestionCognitiveMapping.jsx";
import BuilderNavigation from "../components/BuilderNavigation.jsx";
import { fetchOutcomes, fetchItems, saveOutcomes, saveItems, fetchCourse, updateCourse, updateStatus, fetchStatus, fetchComments, createComment, deleteComment, resolveComment } from '../services/api.js';

const TosSections = ({status, role = 'instructor'}) => {

    const [questions, setQuestions] = useState([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [assessmentMode] = useState("question");
    const [rubricCategories, setRubricCategories] = useState([]);
    const [expandedCOs, setExpandedCOs] = useState(new Set());
    const [expandedILOs, setExpandedILOs] = useState(new Set());
    const [viewMode, setViewMode] = useState('normal');
    const [lastClickedItemId, setLastClickedItemId] = useState(null);
    const [viewItemsTarget, setViewItemsTarget] = useState(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isProgramHead = role === 'program-head';
    const [phSection, setPhSection] = useState('Table of Specifications Report');
    const location = useLocation();
    const { code: courseCode } = useParams();
    const [effectiveStatus, setEffectiveStatus] = useState(location.state?.tosStatus || 'draft');
    const readOnly = !isProgramHead && (effectiveStatus === 'pending' || effectiveStatus === 'approved');
    const isReturnedView = isProgramHead && effectiveStatus === 'returned';
    const isInstructorReturned = !isProgramHead && effectiveStatus === 'returned';
    const defaultSection = isProgramHead || effectiveStatus === 'pending' || effectiveStatus === 'approved' ? 'Table of Specifications Report' : 'Outcome Overview';
    const selectedSection = isProgramHead ? phSection : (searchParams.get('section') || defaultSection);
    const getDefaultOutlines = () => [
        {
            co: "CO1",
            description: "Course Outcome 1",
            totalHours: 10.5,
            totalPercentage: 100,
            totalItems: 20,
            ilos: [
                { id: "ILO1", description: "ILO1", hours: 1.5, percentage: 20, items: 4 },
                { id: "ILO2", description: "ILO2", hours: 3, percentage: 30, items: 6 },
                { id: "ILO3", description: "ILO3", hours: 6, percentage: 50, items: 10 }
            ]
        },
        {
            co: "CO2",
            description: "Course Outcome 2",
            totalHours: 12,
            totalPercentage: 100,
            totalItems: 30,
            ilos: [
                { id: "ILO1", description: "ILO1", hours: 2, percentage: 20, items: 6 },
                { id: "ILO2", description: "ILO2", hours: 4, percentage: 30, items: 9 },
                { id: "ILO3", description: "ILO3", hours: 6, percentage: 50, items: 15 }
            ]
        }
    ];
    const courseName = location.state?.courseName || '';
    const fromExamType = location.state?.examType || 'Midterm';
    const fromSchoolYear = location.state?.schoolYear || String(new Date().getFullYear());
    const fromSemester = location.state?.semester || '1st Semester';
    const [courseNameState, setCourseName] = useState(courseName);
    const [assessmentName, setAssessmentName] = useState('');
    const defaultRows = getDefaultOutlines();

    const [rows, setRows] = useState(defaultRows);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [errorFields, setErrorFields] = useState({});
    const [exportErrors, setExportErrors] = useState({ outcomeOverview: [], assessmentMapping: [], tosSummary: [] });
    const [showExportErrorModal, setShowExportErrorModal] = useState(false);
    const [showHistoryLog, setShowHistoryLog] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(1);
    const [historyPage, setHistoryPage] = useState('tosReport');
    const [historyViewMode, setHistoryViewMode] = useState('normal');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);
    const [returnLoading, setReturnLoading] = useState(false);
    const submitGuardRef = useRef(false);

    // Sample history data for Norton Monica's 2 approved courses
    const historyData = {
        'BSCS223L': {
            versions: [
                { version: 1, status: 'Approved', date: '2026-06-16', actions: [
                    { role: 'Instructor', action: 'submitted the Table of Specifications', date: '2026-06-12' },
                    { role: 'Program Head', action: 'approved the Table of Specifications', date: '2026-06-16' }
                ]}
            ]
        },
        'BSCS314L': {
            versions: [
                { version: 1, status: 'Returned', date: '2026-06-15', actions: [
                    { role: 'Instructor', action: 'submitted the Table of Specifications', date: '2026-06-10' },
                    { role: 'Program Head', action: 'returned the Table of Specifications for revision', date: '2026-06-15', comments: [
                        { scope: { co: 'CO1', ilo: 'ILO1', cognitiveLevel: 'Applying' }, body: 'The modulation items cover amplitude and frequency but lack phase modulation examples. Add at least two items on PSK and QAM techniques.' },
                        { scope: { co: 'CO1', ilo: 'ILO2', cognitiveLevel: 'Analyzing' }, body: 'Clarify the comparison between OSPF and BGP routing protocols. Include a practical network topology scenario.' },
                        { scope: { co: 'CO1', ilo: 'ILO3', cognitiveLevel: 'Evaluating' }, body: 'The CRC section needs more depth. Add items on polynomial division and syndrome calculation.' },
                        { scope: { co: 'CO2', ilo: 'ILO1', cognitiveLevel: 'Applying' }, body: 'IP addressing items should include VLSM subnetting problems. Currently only basic subnet masks are covered.' },
                        { scope: { co: 'CO2', ilo: 'ILO2', cognitiveLevel: 'Creating' }, body: 'Network troubleshooting items lack practical scenarios. Add a lab-based item diagnosing connectivity from Wireshark captures.' }
                    ]}
                ]},
                { version: 2, status: 'Approved', date: '2026-06-20', actions: [
                    { role: 'Instructor', action: 'resubmitted the Table of Specifications', date: '2026-06-18' },
                    { role: 'Program Head', action: 'approved the Table of Specifications', date: '2026-06-20' }
                ]}
            ]
        }
    };

    useEffect(() => {
        if (!courseCode || dataLoaded) return;
        setDataLoaded(true);

        fetchCourse(courseCode).then(course => {
            if (course?.name && !courseNameState) setCourseName(course.name);
            if (course?.assessmentName) setAssessmentName(course.assessmentName);
            if (course?.tosStatus?.status) setEffectiveStatus(course.tosStatus.status);
        }).catch(() => {});

        fetchOutcomes(courseCode).then(data => {
            if (!data) throw new Error('no data');
            const mapped = data.map(o => ({
                dbId: o.id,
                co: o.co,
                description: o.description || '',
                totalHours: (o.ilos || []).reduce((s, i) => s + (i.hours || 0), 0),
                totalPercentage: (o.ilos || []).reduce((s, i) => s + (i.percentage || 0), 0),
                totalItems: (o.ilos || []).reduce((s, i) => s + (i.items || 0), 0),
                ilos: (o.ilos || []).map((ilo, idx) => ({
                    id: `ILO${idx + 1}`,
                    iloDbId: ilo.id,
                    description: ilo.description || '',
                    hours: ilo.hours || 0,
                    percentage: ilo.percentage || 0,
                    items: ilo.items || 0
                }))
            }));
            // sync both COs to same totalItems (50/50) and redistribute ILOs by (hours × percentage)
            const syncedTotal = Math.max(...mapped.map(co => co.totalItems), 0);
            const synced = mapped.map(co => ({
                ...co,
                totalItems: syncedTotal,
                ilos: redistIloItems(co.ilos, syncedTotal)
            }));
            setRows(synced.length ? synced : getDefaultOutlines());
            // build iloLookup: iloDbId → { co, iloLabel }
            const lookup = {};
            data.forEach(o => {
                (o.ilos || []).forEach((ilo, idx) => {
                    lookup[ilo.id] = { co: o.co, iloLabel: `ILO${idx + 1}` };
                });
            });
            iloLookupRef.current = lookup;
        }).catch(() => {
            setRows(getDefaultOutlines());
        });
        // always fetch items (even if outcomes failed)
        fetchItems(courseCode).then(data => {
            if (data && data.length) {
                const lookup = iloLookupRef.current;
                setQuestions(data.map(q => {
                    const info = lookup[q.iloId] || {};
                    return { ...q, co: info.co || q.iloItem?.outcome?.co || '', ilo: info.iloLabel || '' };
                }));
            }
        }).catch(() => {});
        fetchComments(courseCode).then(data => {
            if (data && data.length) {
                setComments(data.map(c => ({
                    id: c.id,
                    scope: { co: c.co, ilo: c.ilo, cognitiveLevel: c.cognitiveLevel, itemNumber: c.itemNumber, courseOutcomeId: c.courseOutcomeId, assessmentItemId: c.assessmentItemId, returnNumber: c.returnNumber || 0 },
                    type: c.type,
                    body: c.body,
                    resolved: c.resolved || false,
                    timestamp: new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' ' + new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                })));
            }
        }).catch(() => {});
        fetchStatus(courseCode).then(s => {
            if (s) {
                setReturnCount(s.returnCount || 0);
                try { setReturnDates(JSON.parse(s.returnDates || '[]')); } catch {}
            }
        }).catch(() => {});
    }, [courseCode, dataLoaded]);

    // re-derive item co/ilo when outcomes load after items
    useEffect(() => {
        const lookup = iloLookupRef.current;
        if (!Object.keys(lookup).length) return;
        setQuestions(prev => prev.map(q => {
            if (q.co && q.ilo) return q;
            const info = lookup[q.iloId] || {};
            return { ...q, co: info.co || q.iloItem?.outcome?.co || q.co, ilo: info.iloLabel || q.ilo };
        }));
    }, [rows]);

    useEffect(() => {
        if (isReturnedView || isInstructorReturned) setShowComment(true);
    }, [isReturnedView, isInstructorReturned]);

    const clearFieldError = (key) => {
        setErrorFields(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    // ── Outcome Overview helpers ──────────────────────────────────────────────

    // Helpers: redistribute ILO items within a CO using (hours × percentage) ratio
    const redistIloItems = (ilos, total) => {
        const newIlos = ilos.map(ilo => ({ ...ilo }));
        if (total > 0) {
            const weights = newIlos.map(ilo => (ilo.hours || 0) * (ilo.percentage || 0));
            const weightSum = weights.reduce((s, w) => s + w, 0);
            if (weightSum > 0) {
                let runningSum = 0;
                newIlos.forEach((ilo, idx) => {
                    if (idx < newIlos.length - 1) {
                        const allocated = Math.round((weights[idx] / weightSum) * total);
                        ilo.items = allocated;
                        runningSum += allocated;
                    } else {
                        ilo.items = total - runningSum;
                    }
                });
            } else {
                const even = Math.floor(total / newIlos.length);
                let runningSum = 0;
                newIlos.forEach((ilo, idx) => {
                    if (idx < newIlos.length - 1) {
                        ilo.items = even;
                        runningSum += even;
                    } else {
                        ilo.items = total - runningSum;
                    }
                });
            }
        } else {
            newIlos.forEach(ilo => { ilo.items = 0; });
        }
        return newIlos;
    };

    // When total CO items changes → sync both COs (50/50), redistribute to ILOs by (hours × percentage)
    const handleTotalItemsChange = (coIndex, value) => {
        // Clear errors for all COs since both get updated
        setErrorFields(prev => {
            const n = { ...prev };
            Object.keys(n).forEach(k => { if (k.startsWith('oo-totalItems-')) delete n[k]; });
            return n;
        });
        setRows(prev => {
            const cleaned = value.replace(/[^0-9]/g, '');
            const total = cleaned === "" ? 0 : Math.min(Number(cleaned), 100);
            return prev.map(co => ({
                ...co,
                totalItems: total,
                ilos: redistIloItems(co.ilos, total)
            }));
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

    const viewItemsNavRef = useRef(false);

    useEffect(() => {
        if (selectedSection !== 'Assessment Items') return;
        if (viewMode === 'group' && questions.length > 0) {
            if (viewItemsNavRef.current) {
                viewItemsNavRef.current = false;
                return;
            }
            setExpandedCOs(new Set(questions.map(q => q.co).filter(Boolean)));
            setExpandedILOs(new Set(questions.filter(q => q.co && q.ilo).map(q => `${q.co}|${q.ilo}`)));
        }
    }, [viewMode, questions, selectedSection]);

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
    const iloLookupRef = useRef({});
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
        setShowResolvedPH(false);
    };

    const toggleCommentPanel = () => {
        if (showComment) { closeCommentPanel(); return; }
        setShowComment(true);
    };
    const [comments, setComments] = useState([]);
    const [addingComment, setAddingComment] = useState(false);
    const [activeScope, setActiveScope] = useState(null);
    const [returnCount, setReturnCount] = useState(0);
    const [returnDates, setReturnDates] = useState([]);
    const [commentType, setCommentType] = useState('Question');
    const [commentBody, setCommentBody] = useState('');
    const [scrolledPastForm, setScrolledPastForm] = useState(false);
    const assessmentBodyRef = useRef(null);
    const [scrolledPastAssessmentTop, setScrolledPastAssessmentTop] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [showReturnConfirm, setShowReturnConfirm] = useState(false);
    const [showApproveCountdown, setShowApproveCountdown] = useState(false);
    const [showReturnCountdown, setShowReturnCountdown] = useState(false);
    const [approveCountdown, setApproveCountdown] = useState(5);
    const [returnCountdown, setReturnCountdown] = useState(5);
    const approveTimerRef = useRef(null);
    const returnTimerRef = useRef(null);
    const preApproveTimerRef = useRef(null);
    const preReturnTimerRef = useRef(null);

    const [commentCategory, setCommentCategory] = useState('outcomeOverview');
    const [recentlyResolved, setRecentlyResolved] = useState(null);
    const [showResolved, setShowResolved] = useState(false);
    const [showResolvedPH, setShowResolvedPH] = useState(false);
    const [returnFilter, setReturnFilter] = useState('all');
    const resolveTimerRef = useRef(null);
    const isInstructorPendingWithComments = effectiveStatus === 'pending' && returnCount > 0;
    const pastReturnMax = (isReturnedView || isInstructorReturned) ? returnCount - 1 : returnCount;
    const resolvedReturnNumbers = [...new Set(comments.filter(c => c.resolved && c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax).map(c => c.scope.returnNumber))];
    const defaultResolvedReturn = resolvedReturnNumbers.length > 0 ? String(Math.max(...resolvedReturnNumbers)) : 'all';
    const resolvedCurrentReturn = comments.filter(c => c.resolved && c.scope.returnNumber === returnCount);

    useEffect(() => {
        if (selectedSection === 'Outcome Overview') setCommentCategory('outcomeOverview');
        else if (selectedSection === 'Assessment Item-Cognitive Level Alignment') setCommentCategory('alignment');
        else if (selectedSection === 'TOS Summary') setCommentCategory('alignment');
        setShowResolved(false);
        setShowResolvedPH(false);
    }, [selectedSection]);

    const handleResolveComment = async (id) => {
        try {
            await resolveComment(courseCode, id, true);
            setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: true } : c));
            setRecentlyResolved(id);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
            resolveTimerRef.current = setTimeout(() => {
                setRecentlyResolved(null);
            }, 3000);
        } catch (err) {
            console.error('Failed to resolve comment:', err);
        }
    };

    const handleUnresolveComment = async (id) => {
        try {
            await resolveComment(courseCode, id, false);
            setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: false } : c));
            setRecentlyResolved(null);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
        } catch (err) {
            console.error('Failed to unresolve comment:', err);
        }
    };

    const filteredComments = comments.filter(c => {
        const isNumberItems = c.scope.cognitiveLevel === 'Number of Items';
        const hasItemNumber = !!c.scope.itemNumber;
        if (commentCategory === 'outcomeOverview') return isNumberItems && !hasItemNumber;
        if (commentCategory === 'assessmentItems') return hasItemNumber;
        return !isNumberItems && !hasItemNumber;
    });

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
    }, [handleCommentScroll, showComment, isInstructorPendingWithComments]);

    const scrollToForm = () => {
        if (commentBodyRef.current) {
            commentBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleAssessmentScroll = useCallback(() => {
        if (assessmentBodyRef.current) {
            setScrolledPastAssessmentTop(assessmentBodyRef.current.scrollTop > 200);
        }
    }, []);

    useEffect(() => {
        const el = assessmentBodyRef.current;
        if (!el || selectedSection !== 'Assessment Items') return;
        el.addEventListener('scroll', handleAssessmentScroll);
        return () => el.removeEventListener('scroll', handleAssessmentScroll);
    }, [handleAssessmentScroll, selectedSection]);

    const isActiveCell = useCallback((co, ilo, cognitiveLevel, itemNumber) => {
        if (!activeScope) return false;
        return activeScope.co === co && activeScope.ilo === ilo && activeScope.cognitiveLevel === cognitiveLevel && (activeScope.itemNumber || null) === (itemNumber || null);
    }, [activeScope]);

    const isTargetCell = (co, ilo, cognitiveLevel) => {
        if (!viewItemsTarget) return false;
        return viewItemsTarget.co === co && viewItemsTarget.ilo === ilo && viewItemsTarget.cognitiveLevel === cognitiveLevel;
    };

    const prevViewItemsRef = useRef(null);
    if (viewItemsTarget) prevViewItemsRef.current = viewItemsTarget;
    const displayTarget = viewItemsTarget || prevViewItemsRef.current;
    const [, forceRender] = useState(0);

    useEffect(() => {
        if (!viewItemsTarget) return;
        const timer = setTimeout(() => setViewItemsTarget(null), 5000);
        return () => clearTimeout(timer);
    }, [viewItemsTarget]);

    useEffect(() => {
        if (viewItemsTarget || !prevViewItemsRef.current) return;
        const timer = setTimeout(() => {
            prevViewItemsRef.current = null;
            forceRender(n => n + 1);
        }, 300);
        return () => clearTimeout(timer);
    }, [viewItemsTarget]);

    const handleCellClick = (co, ilo, cognitiveLevel, itemNumber, fks = {}) => {
        if (!addingComment) return;
        const scopeKey = `${co || '\u2014'}|${ilo || '\u2014'}|${cognitiveLevel || '\u2014'}|${itemNumber || ''}`;
        const currentKey = activeScope ? `${activeScope.co}|${activeScope.ilo}|${activeScope.cognitiveLevel}|${activeScope.itemNumber || ''}` : '';
        if (scopeKey === currentKey) return;
        setActiveScope({ co: co || '\u2014', ilo: ilo || '\u2014', cognitiveLevel: cognitiveLevel || '\u2014', itemNumber, courseOutcomeId: fks.courseOutcomeId || null, assessmentItemId: fks.assessmentItemId || null });
        setCommentType(itemNumber ? 'Question' : '');
        setCommentBody('');
    };

    const handleAddComment = async () => {
        if (!activeScope || !commentBody.trim()) return;
        const payload = {
            co: activeScope.co === '\u2014' ? '' : activeScope.co,
            ilo: activeScope.ilo === '\u2014' ? '' : activeScope.ilo,
            cognitiveLevel: activeScope.cognitiveLevel === '\u2014' ? '' : activeScope.cognitiveLevel,
            itemNumber: activeScope.itemNumber || '',
            body: commentBody.trim(),
            courseOutcomeId: activeScope.courseOutcomeId || null,
            assessmentItemId: activeScope.assessmentItemId || null,
        };
        if (activeScope.itemNumber) payload.type = commentType;
        payload.returnNumber = isProgramHead ? returnCount + 1 : returnCount;
        try {
            const saved = await createComment(courseCode, payload);
            setComments(prev => [...prev, {
                id: saved.id,
                scope: { ...activeScope, returnNumber: payload.returnNumber },
                type: activeScope.itemNumber ? commentType : '',
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
    const canSubmit = allFilled && allItemsHavePoints && questions.length > 0 && comments.every(c => c.resolved);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => { setIsLoading(false); }, 500);
        return () => clearTimeout(timer);
    }, [selectedSection]);

    const prevShowBuilder = useRef(showBuilder);
    useEffect(() => {
        const entering = !prevShowBuilder.current && showBuilder;
        const exiting = prevShowBuilder.current && !showBuilder;
        prevShowBuilder.current = showBuilder;
        if (entering) {
            setCommentCategory('assessmentItems');
            setShowResolved(false);
        }
        if (exiting && selectedSection === 'Assessment Item-Cognitive Level Alignment') {
            setCommentCategory('alignment');
        }
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
                id: r.dbId,
                co: r.co,
                description: r.description || '',
                totalItems: r.totalItems || 0,
                ilos: (r.ilos || []).map(ilo => ({
                    iloDbId: ilo.iloDbId,
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
        setApproveLoading(true);
        preApproveTimerRef.current = setTimeout(() => {
            setApproveLoading(false);
            setShowApproveConfirm(true);
        }, 800);
    };

    const handleStartReturn = () => {
        setReturnLoading(true);
        preReturnTimerRef.current = setTimeout(() => {
            setReturnLoading(false);
            setShowReturnConfirm(true);
        }, 800);
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
            navigate('/role/program-head/tos', { state: { tosStatusUpdate: { courseCode, newStatus: 'approved' }, initialStatus: 'approved' } });
        }
    };

    const handleReturn = async () => {
        if (courseCode) {
            await updateStatus(courseCode, 'returned');
            navigate('/role/program-head/tos', { state: { tosStatusUpdate: { courseCode, newStatus: 'returned' }, initialStatus: 'returned' } });
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

    useEffect(() => {
        return () => {
            if (preApproveTimerRef.current) clearTimeout(preApproveTimerRef.current);
            if (preReturnTimerRef.current) clearTimeout(preReturnTimerRef.current);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
            if (approveTimerRef.current) clearTimeout(approveTimerRef.current);
            if (returnTimerRef.current) clearTimeout(returnTimerRef.current);
        };
    }, []);

    const handleCommentNavigation = (c) => {
        if (c.scope.itemNumber) {
            if (isProgramHead && selectedSection !== 'Assessment Items') setPhSection('Assessment Items');
            else if (!isProgramHead) setSearchParams({ section: 'Assessment Items' });
            viewItemsNavRef.current = true;
            setViewMode('group');
            const coSet = new Set(c.scope.ilo && c.scope.ilo !== '\u2014' ? questions.map(q => q.co).filter(Boolean) : [c.scope.co]);
            const iloSet = c.scope.ilo && c.scope.ilo !== '\u2014' ? new Set([`${c.scope.co}|${c.scope.ilo}`]) : new Set();
            setExpandedCOs(coSet);
            setExpandedILOs(iloSet);
            setTimeout(() => {
                const co = c.scope.co;
                const ilo = c.scope.ilo;
                const cog = c.scope.cognitiveLevel;
                const el = document.querySelector(`[data-co="${co}"][data-ilo="${ilo}"][data-cog="${cog}"]`) || document.querySelector(`[data-ilo-header="${co}|${ilo}"]`) || document.getElementById(`co-header-${co}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 600);
        } else {
            if (isProgramHead && selectedSection !== 'Table of Specifications Report') setPhSection('Table of Specifications Report');
            const co = c.scope.co;
            const ilo = c.scope.ilo;
            const rowKey = ilo && ilo !== '\u2014' ? `${co}|${ilo}` : co;
            setTimeout(() => {
                const el = document.querySelector(`[data-tos-row="${rowKey}"]`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 400);
        }
    };

    const InfoBadge = ({ text }) => (
        text ? (
            <span className={layout.infoBadge}>
                <span className={layout.infoIcon}>!</span>
                <span className={layout.infoTooltip}>{text}</span>
            </span>
        ) : null
    );

    return (
        <>
            <div className={styles.container}>
                {showBuilder ? (
                    <BuilderNavigation
                        onSave={() => builderSaveRef.current && builderSaveRef.current()}
                        onClose={() => setShowBuilder(false)}
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
                                {isReturnedView || isProgramHead || effectiveStatus === 'pending' || effectiveStatus === 'approved' ? (
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

                        {isReturnedView ? (
                            <span className={styles.draft} style={{ color: '#999', cursor: 'default' }}>View Only</span>
                        ) : isProgramHead ? (
                            effectiveStatus === 'approved' && historyData[courseCode] ? (
                                <>
                                    <button className={styles.historyBtn} onClick={() => { setShowHistoryLog(true); setSelectedVersion(1); }}>
                                        <Clock size={16} /> History Log
                                    </button>
                                    <button className={styles.exportBtn} onClick={() => console.log('Export')}>
                                        <Download size={16} /> Export
                                    </button>
                                </>
                            ) : effectiveStatus === 'approved' ? (
                                <>
                                    <button className={styles.exportBtn} onClick={() => console.log('Export')}>
                                        <Download size={16} /> Export
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div ref={commentBtnRef} className={`${styles.draft} ${layout.commentBtn} ${showComment ? layout.commentBtnActive : ''}`} onClick={toggleCommentPanel}>
                                        Add Comment
                                    </div>
                                    <button className={styles.submit} onClick={handleStartApprove} disabled={approveLoading}>
                                        {approveLoading ? <Loader size={16} className={layout.spinner} /> : null}
                                        {approveLoading ? 'Approving…' : 'Approve'}
                                    </button>
                                </>
                            )
                        ) : readOnly ? (
                            effectiveStatus === 'approved' && historyData[courseCode] ? (
                                <>
                                    <button className={styles.historyBtn} onClick={() => { setShowHistoryLog(true); setSelectedVersion(1); }}>
                                        <Clock size={16} /> History Log
                                    </button>
                                    <button className={styles.exportBtn} onClick={() => console.log('Export')}>
                                        <Download size={16} /> Export
                                    </button>
                                </>
                            ) : effectiveStatus === 'approved' ? (
                                <>
                                    <button className={styles.exportBtn} onClick={() => console.log('Export')}>
                                        <Download size={16} /> Export
                                    </button>
                                </>
                            ) : (
                                <span className={styles.draft} style={{ color: '#999', cursor: 'default' }}>View Only</span>
                            )
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
                                                id: r.dbId,
                                                co: r.co,
                                                description: r.description || '',
                                                totalItems: r.totalItems || 0,
                                                ilos: (r.ilos || []).map(ilo => ({
                                                    iloDbId: ilo.iloDbId,
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
                            <span className={styles.submitTooltip}>{!allFilled ? 'Disabled due to incomplete assessment items' : !allItemsHavePoints ? 'Disabled due to items missing points' : 'Disabled due to unresolved comments'}</span>
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
                                                    return iloSum + items.reduce((s, item) => s + (item.span || 1) * item.points, 0);
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
                                                            <tr data-tos-row={co.co} style={{ background: '#F9FAFB', height: '50px' }}>
                                                                 <td><div className={previewLayout.cellBox} style={{ fontWeight: 'bold' }}>{co.co}<InfoBadge text={co.description} /></div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalHours || 0}</div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalPercentage || 0}</div></td>
                                                                  <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, '\u2014', 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, '\u2014', 'Number of Items') ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, '\u2014', 'Number of Items', undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: '\u2014', cognitiveLevel: 'Number of Items', top: r.bottom, left: r.left, width: r.width }); })()}><div className={previewLayout.cellBox}>{co.totalItems || 0}</div></td>
                                                                  {cognitiveLevels.map(level => (
                                                                     <td key={level} style={{ background: 'white' }}></td>
                                                                 ))}
                                                             </tr>
                                                              {co.ilos.map(ilo => (
                                                                  <tr key={ilo.id} data-tos-row={`${co.co}|${ilo.id}`}>
                                                                      <td><div className={previewLayout.cellBox}>{ilo.id}<InfoBadge text={ilo.description} /></div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.hours || 0}</div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.percentage || 0}</div></td>
                                                                        <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, ilo.id, 'Number of Items') ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, ilo.id, 'Number of Items', undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: 'Number of Items', top: r.bottom, left: r.left, width: r.width }); })()}><div className={previewLayout.cellBox}>{ilo.items || 0}</div></td>
                                                                     {cognitiveLevels.map(level => {
const items = aggregatedData[co.co][ilo.id][level];
                                                                          return (
                                                                                 <td key={level} className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, level) ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, ilo.id, level) ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, ilo.id, level, undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: level, top: r.bottom, left: r.left, width: r.width, isEmpty: items.length === 0 }); })()}>                                                                                  <div className={previewLayout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
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
                                                      <tr data-tos-row="Total" style={{ background: '#F9FAFB', height: '50px', fontWeight: '500' }}>
                                                          <td><div className={previewLayout.cellBox}>Total</div></td>
                                                          <td><div className={previewLayout.cellBox}>{totalHours}</div></td>
                                                          <td><div className={previewLayout.cellBox}>{totalPercentage}</div></td>
                                                           <td><div className={previewLayout.cellBox}>{totalItems}</div></td>
                                                          {totalCognitive.map((total, index) => (
                                                               <td key={index}><div className={previewLayout.cellBox}>{total}</div></td>
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
                                    <div ref={assessmentBodyRef} className={`${previewLayout.assessmentBody} ${previewLayout.tabContent}`}>
                                        {scrolledPastAssessmentTop && (
                                            <div className={layout.scrollToFormBtn} onClick={() => assessmentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
                                                <ChevronUp size={22} strokeWidth={2.5} />
                                            </div>
                                        )}
                                        <div className={layout.viewToggleRow}>
                                            <span className={layout.assessmentLabel}>Assessment: {assessmentName || 'Midterm'}</span>
                                            <div className={layout.viewToggleGroup}>
                                                <div className={layout.viewToggleSlider} style={{ transform: `translateX(${viewMode === 'normal' ? '0' : 'calc(100% + 2px)'})` }} />
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
                                                        <div key={q.id} data-item-id={q.id} className={`${previewLayout.assessmentItem} ${layout.assessmentCard}${addingComment ? ` ${layout.cellSelectable}${isActiveCell(q.co, q.ilo, q.cognitiveLevel, label) ? ` ${layout.cellActive}` : ''}` : ''}`} onClick={addingComment ? () => { setLastClickedItemId(q.id); handleCellClick(q.co, q.ilo, q.cognitiveLevel, label, { assessmentItemId: q.id }); } : undefined}>
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
                                                const coDesc = {};
                                                const iloDesc = {};
                                                rows.forEach(c => {
                                                    coDesc[c.co] = c.description;
                                                    c.ilos.forEach(il => { iloDesc[`${c.co}|${il.id}`] = il.description; });
                                                });
                                                return viewMode === 'normal' ? (
                                                    questions.map(q => renderItem(q))
                                                ) : (
                                                    Object.entries(grouped).map(([co, ilos]) => (
                                                        <div key={co} className={layout.coGroup}>
                                                             <div className={layout.coHeader} id={`co-header-${co}`} onClick={() => toggleCO(co)}>
                                                                 <span className={layout.accordionArrow}>{expandedCOs.has(co) ? '\u25BE' : '\u25B8'}</span>
                                                                 <div>
                                                                     <span className={layout.coTitle}>{co}</span>
                                                                     {coDesc[co] && <div className={layout.coDesc}>{coDesc[co]}</div>}
                                                                 </div>
                                                             </div>
                                                            {expandedCOs.has(co) && Object.entries(ilos).map(([ilo, cogs]) => (
                                                                <div key={ilo} className={layout.iloGroup}>
                                                                      <div className={layout.iloHeader} data-ilo-header={`${co}|${ilo}`} onClick={() => toggleILO(`${co}|${ilo}`)}>
                                                                         <span className={layout.accordionArrow}>{expandedILOs.has(`${co}|${ilo}`) ? '\u25BE' : '\u25B8'}</span>
                                                                         <div>
                                                                             <span className={layout.iloTitle}>{ilo}</span>
                                                                             {iloDesc[`${co}|${ilo}`] && <div className={layout.iloDesc}>{iloDesc[`${co}|${ilo}`]}</div>}
                                                                         </div>
                                                                     </div>
                                                                    {expandedILOs.has(`${co}|${ilo}`) && Object.entries(cogs).map(([cog, items]) => (
                                                                         <div key={cog} className={layout.cogGroup}>
                                                                             <div className={layout.cogHeader} data-co={co} data-ilo={ilo} data-cog={cog}>{cog}</div>
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
                            {displayTarget && (
                                <div className={`${layout.viewItemsOverlay}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} onClick={() => setViewItemsTarget(null)} />
                            )}
                            {displayTarget && (
                                <div className={`${layout.viewItemsPopup}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} style={{ top: displayTarget.top + 4, left: displayTarget.left + displayTarget.width / 2 }}>
                                        <button className={layout.viewItemsBtn} disabled={viewItemsTarget?.isEmpty} onClick={() => {
                                            const t = viewItemsTarget;
                                            setViewItemsTarget(null);
                                            if (!t) return;
                                            if (isProgramHead) setPhSection('Assessment Items');
                                            else setSearchParams({ section: 'Assessment Items' });
                                            viewItemsNavRef.current = true;
                                            setViewMode('group');
                                           const coSet = new Set(t.ilo && t.ilo !== '\u2014' ? questions.map(q => q.co).filter(Boolean) : [t.co]);
                                           const iloSet = t.ilo && t.ilo !== '\u2014' ? new Set([`${t.co}|${t.ilo}`]) : new Set();
                                           setExpandedCOs(coSet);
                                           setExpandedILOs(iloSet);
                                           setTimeout(() => {
                                               const el = document.querySelector(`[data-co="${t.co}"][data-ilo="${t.ilo}"][data-cog="${t.cognitiveLevel}"]`) || document.querySelector(`[data-ilo-header="${t.co}|${t.ilo}"]`) || document.getElementById(`co-header-${t.co}`);
                                               if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                           }, 600);
                                       }}>View Assessment Items</button>
                                </div>
                            )}
                            {(showComment || isReturnedView) && <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span className={layout.commentPanelTitle}>{showResolvedPH ? 'Past returns' : 'Comments'}</span>
                                        {returnCount >= (isReturnedView ? 2 : 1) && resolvedReturnNumbers.length > 0 && <button className={`${layout.commentResolvedToggleBtn} ${showResolvedPH ? layout.active : ''}`} onClick={() => { setShowResolvedPH(p => !p); if (!showResolvedPH) { setReturnFilter(defaultResolvedReturn); setAddingComment(false); setActiveScope(null); } }}>
                                            {showResolvedPH ? 'See active comments' : 'See past returns'}
                                        </button>}
                                    </div>
                                    {!isReturnedView && <span style={{ cursor: 'pointer', fontSize: 18, lineHeight: 1, color: '#888', userSelect: 'none' }} onClick={closeCommentPanel}>&times;</span>}
                                </div>
                                <div ref={commentBodyRef} className={layout.commentPanelBody}>
                                    {scrolledPastForm && (
                                        <div className={layout.scrollToFormBtn} onClick={scrollToForm}>
                                            <ChevronUp size={22} strokeWidth={2.5} />
                                        </div>
                                    )}
                                    {addingComment && activeScope && !showResolvedPH ? (
                                        <div className={layout.commentFormCard}>
                                            <div className={layout.commentScope}>Commenting on {activeScope.co}{activeScope.ilo !== '—' ? ` → ${activeScope.ilo}` : ''} → {activeScope.cognitiveLevel}{activeScope.itemNumber ? ` → Item ${activeScope.itemNumber}` : ''}</div>
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
                                    ) : addingComment && !showResolvedPH ? (
                                        <div className={layout.commentFormCard}>
                                            <div className={layout.selectionCard} style={{ marginBottom: 0 }}>
                                                <div className={layout.selectionPrompt}>Select a cell to comment on...</div>
                                                <button className={layout.selectionCancel} onClick={handleCancelComment}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : isReturnedView || showResolvedPH ? null : (
                                        <button className={layout.addCommentBtn} onClick={() => setAddingComment(true)}>
                                            + New Comment
                                        </button>
                                    )}
                                    {showResolvedPH ? (
                                        <>
                                            {returnCount > 0 && (
                                                <div style={{ marginBottom: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
                                                        <select className={layout.commentFilterDropdown} value={returnFilter} onChange={e => setReturnFilter(e.target.value)} style={{ flex: 1 }}>
                                                            <option value="all">All returns</option>
                                                            {Array.from({ length: Math.max(0, pastReturnMax) }, (_, i) => i + 1).filter(n => resolvedReturnNumbers.includes(n)).map(n => (
                                                                <option key={n} value={n}>Return {n}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: 20 }} />
                                            {returnFilter !== 'all' && returnDates[Number(returnFilter) - 1] && (
                                                <div style={{ fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 12 }}>
                                                    Returned {new Date(returnDates[Number(returnFilter) - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                            {(() => {
                                                const filtered = comments.filter(c => c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax && (returnFilter === 'all' || c.scope.returnNumber === Number(returnFilter)));
                                                if (filtered.length === 0) return <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments from past returns</div>;
                                                if (returnFilter !== 'all') return filtered.map(c => (
                                                    <div key={c.id} className={layout.commentCard}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ));
                                                const groups = {};
                                                filtered.forEach(c => { const r = c.scope.returnNumber || 0; if (!groups[r]) groups[r] = []; groups[r].push(c); });
                                                return Object.keys(groups).sort((a, b) => a - b).map(r => (
                                                    <div key={r}>
                                                        <div style={{ fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 8, paddingTop: r > 0 ? 4 : 0 }}>
                                                            Return {r}{returnDates[r - 1] ? ` — ${new Date(returnDates[r - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                                                        </div>
                                                        {groups[r].map(c => (
                                                            <div key={c.id} className={layout.commentCard}>
                                                                <div className={layout.commentCardHeader}>
                                                                    <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                                </div>
                                                                {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                                <div className={layout.commentCardBody}>{c.body}</div>
                                                                <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    ) : (
                                        <>
                                    {addingComment && comments.filter(c => !c.resolved).length > 0 && (
                                        <div className={layout.commentSectionLabel}>Other open comments ({comments.filter(c => !c.resolved).length})</div>
                                    )}
                                    {comments.filter(c => !c.resolved).length === 0 && !addingComment && (
                                        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments yet</div>
                                    )}
                                    {comments.filter(c => !c.resolved).map(c => (
                                        <div key={c.id} className={`${layout.commentCard}${addingComment ? ` ${layout.commentCardDimmed}` : ''}`} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                            <div className={layout.commentCardHeader}>
                                                <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                {!isReturnedView && <span className={layout.commentDeleteBtnWrap} onClick={e => { e.stopPropagation(); handleDeleteComment(c.id); }}><Trash2 size={16} /></span>}
                                            </div>
                                            {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                            <div className={layout.commentCardBody}>{c.body}</div>
                                            <div className={layout.commentCardTime}>{c.timestamp}</div>
                                        </div>
                                    ))}
                                        </>
                                    )}
                                </div>
                                {!isReturnedView && !showResolvedPH && <div className={layout.commentPanelFooter}>
                                    <button className={layout.commentReturnBtn} disabled={comments.length === 0 || returnLoading} onClick={handleStartReturn}>
                                        {returnLoading ? <Loader size={16} className={layout.spinner} /> : null}
                                        {returnLoading ? 'Returning…' : 'Return'}
                                    </button>
                                </div>}
                            </div>}
                        </div>
                        )
                    : isInstructorReturned ? (
                        <div className={layout.panelLayout}>
                            <div className={layout.panelMain}>
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
                                                            <div className={layout.blankCell} style={{ textAlign: 'left', fontSize: 14 }}>
                                                                {co.description}
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
                                                                     readOnly
                                                                     value={ilo.items}
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
                                            showComments
                                        />
                                    </section>
                                )}

                                {selectedSection === 'TOS Summary' &&
                                    <section>
                                        <TOSSummary outcomeData={rows} questions={questions} />
                                    </section>
                                }
                            </div>
                            {selectedSection !== 'TOS Summary' && (
                            <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span className={layout.commentPanelTitle}>{showResolvedPH ? 'Past returns' : 'Comments'}</span>
                                        {returnCount >= 2 && resolvedReturnNumbers.length > 0 && <button className={`${layout.commentResolvedToggleBtn} ${showResolvedPH ? layout.active : ''}`} onClick={() => { setShowResolvedPH(p => !p); if (!showResolvedPH) { setReturnFilter(defaultResolvedReturn); setAddingComment(false); setActiveScope(null); } }}>
                                            {showResolvedPH ? 'See active comments' : 'See past returns'}
                                        </button>}
                                    </div>
                                </div>
                                <div ref={commentBodyRef} className={layout.commentPanelBody}>
                                    {scrolledPastForm && (
                                        <div className={layout.scrollToFormBtn} onClick={scrollToForm}>
                                            <ChevronUp size={22} strokeWidth={2.5} />
                                        </div>
                                    )}
                                    {showResolvedPH ? (
                                        <>
                                            {returnCount > 0 && (
                                                <div style={{ marginBottom: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
                                                        <select className={layout.commentFilterDropdown} value={returnFilter} onChange={e => setReturnFilter(e.target.value)} style={{ flex: 1 }}>
                                                            <option value="all">All returns</option>
                                                            {Array.from({ length: Math.max(0, pastReturnMax) }, (_, i) => i + 1).filter(n => resolvedReturnNumbers.includes(n)).map(n => (
                                                                <option key={n} value={n}>Return {n}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: 20 }} />
                                            {returnFilter !== 'all' && returnDates[Number(returnFilter) - 1] && (
                                                <div style={{ fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 12 }}>
                                                    Returned {new Date(returnDates[Number(returnFilter) - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                            {(() => {
                                                const filtered = comments.filter(c => c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax && (returnFilter === 'all' || c.scope.returnNumber === Number(returnFilter)));
                                                if (filtered.length === 0) return <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments from past returns</div>;
                                                if (returnFilter !== 'all') return filtered.map(c => (
                                                    <div key={c.id} className={layout.commentCard}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ));
                                                const groups = {};
                                                filtered.forEach(c => { const r = c.scope.returnNumber || 0; if (!groups[r]) groups[r] = []; groups[r].push(c); });
                                                return Object.keys(groups).sort((a, b) => a - b).map(r => (
                                                    <div key={r}>
                                                        <div style={{ fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 8, paddingTop: r > 0 ? 4 : 0 }}>
                                                            Return {r}{returnDates[r - 1] ? ` — ${new Date(returnDates[r - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                                                        </div>
                                                        {groups[r].map(c => (
                                                            <div key={c.id} className={layout.commentCard}>
                                                                <div className={layout.commentCardHeader}>
                                                                    <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                                </div>
                                                                {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                                <div className={layout.commentCardBody}>{c.body}</div>
                                                                <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    ) : (
                                        <>
                                        <select
                                            value={commentCategory}
                                            onChange={e => { setCommentCategory(e.target.value); setShowResolved(false); }}
                                            style={{ width: '100%', padding: '8px 28px 8px 12px', borderRadius: 5, border: '1px solid #DDDFDF', fontSize: 14, fontWeight: 500, color: '#333', background: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14, marginBottom: 12 }}
                                        >
                                            <option value="outcomeOverview" style={{ fontSize: 14 }}>Outcome Overview</option>
                                            <option value="alignment" style={{ fontSize: 14 }}>Alignment</option>
                                            <option value="assessmentItems" style={{ fontSize: 14 }}>Assessment Items</option>
                                        </select>
                                        <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: 12 }} />
                                    {(() => {
                                        const unresolved = filteredComments.filter(c => !c.resolved);
                                        return (
                                            <>
                                                {unresolved.length === 0 && filteredComments.length === 0 && (
                                                    <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments yet</div>
                                                )}
                                                {unresolved.length === 0 && filteredComments.length > 0 && (
                                                    <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '16px 0' }}>All comments resolved</div>
                                                )}
                                                {unresolved.map(c => (
                                                    <div key={c.id} className={layout.commentCard}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                            <span className={layout.commentResolveBtnWrap} onClick={() => handleResolveComment(c.id)}><CheckCircle size={16} /></span>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ))}
                                            </>
                                        );
                                    })()}
                                    {resolvedCurrentReturn.length > 0 && (
                                        <div className={layout.resolvedSection}>
                                            <div className={layout.resolvedHeader} onClick={() => { setShowResolved(p => !p); if (!showResolved && commentBodyRef.current) { setTimeout(() => commentBodyRef.current.scrollBy({ top: 100, behavior: 'smooth' }), 100); } }}>
                                                <span>Recently resolved ({resolvedCurrentReturn.length})</span>
                                                <span className={layout.resolvedToggle}>{showResolved ? '−' : '+'}</span>
                                            </div>
                                            <div className={`${layout.resolvedCards}${showResolved ? ` ${layout.resolvedCardsOpen}` : ''}`}>
                                                {resolvedCurrentReturn.map(c => (
                                                    <div key={c.id} className={`${layout.commentCard} ${layout.commentCardResolved}`}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                            <span className={layout.commentUndoBtnWrap} onClick={() => handleUnresolveComment(c.id)}><RotateCcw size={16} /></span>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                        </>
                                    )}
                                    {recentlyResolved && (
                                        <div className={layout.undoBarFixed}>
                                            <span>Comment marked as resolved</span>
                                            <button className={layout.undoBtn} onClick={() => handleUnresolveComment(recentlyResolved)}>
                                                <RotateCcw size={14} /> Undo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            )}
                        </div>
                    )
                    : effectiveStatus === 'pending' || effectiveStatus === 'approved' ? (
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
                                                    return iloSum + items.reduce((s, item) => s + (item.span || 1) * item.points, 0);
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
                                                            <tr data-tos-row={co.co} style={{ background: '#F9FAFB', height: '50px' }}>
                                                                 <td><div className={previewLayout.cellBox} style={{ fontWeight: 'bold' }}>{co.co}<InfoBadge text={co.description} /></div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalHours || 0}</div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalPercentage || 0}</div></td>
                                                                  <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, '\u2014', 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, '\u2014', 'Number of Items') ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, '\u2014', 'Number of Items', undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: '\u2014', cognitiveLevel: 'Number of Items', top: r.bottom, left: r.left, width: r.width }); })()}><div className={previewLayout.cellBox}>{co.totalItems || 0}</div></td>
                                                                  {cognitiveLevels.map(level => (
                                                                     <td key={level} style={{ background: 'white' }}></td>
                                                                 ))}
                                                             </tr>
                                                              {co.ilos.map(ilo => (
                                                                  <tr key={ilo.id} data-tos-row={`${co.co}|${ilo.id}`}>
                                                                      <td><div className={previewLayout.cellBox}>{ilo.id}<InfoBadge text={ilo.description} /></div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.hours || 0}</div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.percentage || 0}</div></td>
                                                                        <td className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, 'Number of Items') ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, ilo.id, 'Number of Items') ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, ilo.id, 'Number of Items', undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: 'Number of Items', top: r.bottom, left: r.left, width: r.width }); })()}><div className={previewLayout.cellBox}>{ilo.items || 0}</div></td>
                                                                     {cognitiveLevels.map(level => {
                                                                         const items = aggregatedData[co.co][ilo.id][level];
                                                                         return (
                                                                             <td key={level} className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, level) ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, ilo.id, level) ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, ilo.id, level, undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: level, top: r.bottom, left: r.left, width: r.width, isEmpty: items.length === 0 }); })()}>                                                                                  <div className={previewLayout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
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
                                                      <tr data-tos-row="Total" style={{ background: '#F9FAFB', height: '50px', fontWeight: '500' }}>
                                                          <td><div className={previewLayout.cellBox}>Total</div></td>
                                                          <td><div className={previewLayout.cellBox}>{totalHours}</div></td>
                                                          <td><div className={previewLayout.cellBox}>{totalPercentage}</div></td>
                                                           <td><div className={previewLayout.cellBox}>{totalItems}</div></td>
                                                          {totalCognitive.map((total, index) => (
                                                               <td key={index}><div className={previewLayout.cellBox}>{total}</div></td>
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
                                        <div ref={assessmentBodyRef} className={`${previewLayout.assessmentBody} ${previewLayout.tabContent}`}>
                                            {scrolledPastAssessmentTop && (
                                                <div className={layout.scrollToFormBtn} onClick={() => assessmentBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
                                                    <ChevronUp size={22} strokeWidth={2.5} />
                                                </div>
                                            )}
                                            <div className={layout.viewToggleRow}>
                                                <span className={layout.assessmentLabel}>Assessment: {assessmentName || 'Midterm'}</span>
                                                <div className={layout.viewToggleGroup}>
                                                    <div className={layout.viewToggleSlider} style={{ transform: `translateX(${viewMode === 'normal' ? '0' : 'calc(100% + 2px)'})` }} />
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
                                                            <div key={q.id} data-item-id={q.id} className={`${previewLayout.assessmentItem} ${layout.assessmentCard}${addingComment ? ` ${layout.cellSelectable}${isActiveCell(q.co, q.ilo, q.cognitiveLevel, label) ? ` ${layout.cellActive}` : ''}` : ''}`} onClick={addingComment ? () => { setLastClickedItemId(q.id); handleCellClick(q.co, q.ilo, q.cognitiveLevel, label, { assessmentItemId: q.id }); } : undefined}>
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
                                                    const coDesc = {};
                                                    const iloDesc = {};
                                                    rows.forEach(c => {
                                                        coDesc[c.co] = c.description;
                                                        c.ilos.forEach(il => { iloDesc[`${c.co}|${il.id}`] = il.description; });
                                                    });
                                                    return viewMode === 'normal' ? (
                                                        questions.map(q => renderItem(q))
                                                    ) : (
                                                        Object.entries(grouped).map(([co, ilos]) => (
                                                            <div key={co} className={layout.coGroup}>
                                                                 <div className={layout.coHeader} id={`co-header-${co}`} onClick={() => toggleCO(co)}>
                                                                     <span className={layout.accordionArrow}>{expandedCOs.has(co) ? '\u25BE' : '\u25B8'}</span>
                                                                     <div>
                                                                         <span className={layout.coTitle}>{co}</span>
                                                                         {coDesc[co] && <div className={layout.coDesc}>{coDesc[co]}</div>}
                                                                     </div>
                                                                 </div>
                                                                {expandedCOs.has(co) && Object.entries(ilos).map(([ilo, cogs]) => (
                                                                    <div key={ilo} className={layout.iloGroup}>
                                                                          <div className={layout.iloHeader} data-ilo-header={`${co}|${ilo}`} onClick={() => toggleILO(`${co}|${ilo}`)}>
                                                                             <span className={layout.accordionArrow}>{expandedILOs.has(`${co}|${ilo}`) ? '\u25BE' : '\u25B8'}</span>
                                                                             <div>
                                                                                 <span className={layout.iloTitle}>{ilo}</span>
                                                                                 {iloDesc[`${co}|${ilo}`] && <div className={layout.iloDesc}>{iloDesc[`${co}|${ilo}`]}</div>}
                                                                             </div>
                                                                         </div>
                                                                        {expandedILOs.has(`${co}|${ilo}`) && Object.entries(cogs).map(([cog, items]) => (
                                                                             <div key={cog} className={layout.cogGroup}>
                                                                                 <div className={layout.cogHeader} data-co={co} data-ilo={ilo} data-cog={cog}>{cog}</div>
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
                                {displayTarget && (
                                    <div className={`${layout.viewItemsOverlay}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} onClick={() => setViewItemsTarget(null)} />
                                )}
                                {displayTarget && (
                                    <div className={`${layout.viewItemsPopup}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} style={{ top: displayTarget.top + 4, left: displayTarget.left + displayTarget.width / 2 }}>
                                            <button className={layout.viewItemsBtn} disabled={viewItemsTarget?.isEmpty} onClick={() => {
                                                const t = viewItemsTarget;
                                                if (!t) return;
                                                setViewItemsTarget(null);
                                                setSearchParams({ section: 'Assessment Items' });
                                                viewItemsNavRef.current = true;
                                                setViewMode('group');
                                               const coSet = new Set(t.ilo && t.ilo !== '\u2014' ? questions.map(q => q.co).filter(Boolean) : [t.co]);
                                               const iloSet = t.ilo && t.ilo !== '\u2014' ? new Set([`${t.co}|${t.ilo}`]) : new Set();
                                               setExpandedCOs(coSet);
                                               setExpandedILOs(iloSet);
                                               setTimeout(() => {
                                                   const el = document.querySelector(`[data-co="${t.co}"][data-ilo="${t.ilo}"][data-cog="${t.cognitiveLevel}"]`) || document.querySelector(`[data-ilo-header="${t.co}|${t.ilo}"]`) || document.getElementById(`co-header-${t.co}`);
                                                   if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                               }, 600);
                                            }}>View Assessment Items</button>
                                    </div>
                                )}
                            </div>
                            {isInstructorPendingWithComments && (
                            <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span className={layout.commentPanelTitle}>{showResolvedPH ? 'Past returns' : 'Comments'}</span>
                                        {returnCount >= 2 && resolvedReturnNumbers.length > 0 && <button className={`${layout.commentResolvedToggleBtn} ${showResolvedPH ? layout.active : ''}`} onClick={() => { setShowResolvedPH(p => !p); if (!showResolvedPH) { setReturnFilter(defaultResolvedReturn); setAddingComment(false); setActiveScope(null); } }}>
                                            {showResolvedPH ? 'See active comments' : 'See past returns'}
                                        </button>}
                                    </div>
                                </div>
                                <div ref={commentBodyRef} className={layout.commentPanelBody}>
                                    {scrolledPastForm && (
                                        <div className={layout.scrollToFormBtn} onClick={scrollToForm}>
                                            <ChevronUp size={22} strokeWidth={2.5} />
                                        </div>
                                    )}
                                    {showResolvedPH ? (
                                        <>
                                            {returnCount > 0 && (
                                                <div style={{ marginBottom: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: '#6B7280', marginBottom: 12 }}>
                                                        <select className={layout.commentFilterDropdown} value={returnFilter} onChange={e => setReturnFilter(e.target.value)} style={{ flex: 1 }}>
                                                            <option value="all">All returns</option>
                                                            {Array.from({ length: Math.max(0, pastReturnMax) }, (_, i) => i + 1).filter(n => resolvedReturnNumbers.includes(n)).map(n => (
                                                                <option key={n} value={n}>Return {n}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: 20 }} />
                                            {returnFilter !== 'all' && returnDates[Number(returnFilter) - 1] && (
                                                <div style={{ fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 12 }}>
                                                    Returned {new Date(returnDates[Number(returnFilter) - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                            {(() => {
                                                const filtered = comments.filter(c => c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax && (returnFilter === 'all' || c.scope.returnNumber === Number(returnFilter)));
                                                if (filtered.length === 0) return <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments from past returns</div>;
                                                if (returnFilter !== 'all') return filtered.map(c => (
                                                    <div key={c.id} className={layout.commentCard}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ));
                                                const groups = {};
                                                filtered.forEach(c => { const r = c.scope.returnNumber || 0; if (!groups[r]) groups[r] = []; groups[r].push(c); });
                                                return Object.keys(groups).sort((a, b) => a - b).map(r => (
                                                    <div key={r}>
                                                        <div style={{ fontSize: 13, color: '#000000', textAlign: 'center', marginBottom: 8, paddingTop: r > 0 ? 4 : 0 }}>
                                                            Return {r}{returnDates[r - 1] ? ` — ${new Date(returnDates[r - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}
                                                        </div>
                                                        {groups[r].map(c => (
                                                            <div key={c.id} className={layout.commentCard}>
                                                                <div className={layout.commentCardHeader}>
                                                                    <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                                </div>
                                                                {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                                <div className={layout.commentCardBody}>{c.body}</div>
                                                                <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ));
                                            })()}
                                        </>
                                    ) : (
                                        <>
                                        <select
                                            value={commentCategory}
                                            onChange={e => { setCommentCategory(e.target.value); setShowResolved(false); }}
                                            style={{ width: '100%', padding: '8px 28px 8px 12px', borderRadius: 5, border: '1px solid #DDDFDF', fontSize: 14, fontWeight: 500, color: '#333', background: '#fff', outline: 'none', cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', backgroundSize: 14, marginBottom: 12 }}
                                        >
                                            <option value="outcomeOverview" style={{ fontSize: 14 }}>Outcome Overview</option>
                                            <option value="alignment" style={{ fontSize: 14 }}>Alignment</option>
                                            <option value="assessmentItems" style={{ fontSize: 14 }}>Assessment Items</option>
                                        </select>
                                        <div style={{ borderTop: '1px solid #E5E7EB', marginBottom: 12 }} />
                                        {filteredComments.length === 0 ? (
                                            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '40px 0' }}>No comments</div>
                                        ) : (
                                            filteredComments.map(c => (
                                                <div key={c.id} className={layout.commentCard}>
                                                    <div className={layout.commentCardHeader}>
                                                        <div className={layout.commentCardScope}>{c.scope.co}{c.scope.ilo !== '—' ? ` → ${c.scope.ilo}` : ''} → {c.scope.cognitiveLevel}{c.scope.itemNumber ? ` → Item ${c.scope.itemNumber}` : ''}</div>
                                                    </div>
                                                    {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                    <div className={layout.commentCardBody}>{c.body}</div>
                                                    <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                </div>
                                            ))
                                        )}
                                        </>
                                    )}
                                </div>
                            </div>
                            )}
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
                                                        <div className={layout.blankCell} style={{ textAlign: 'left', fontSize: 14 }}>
                                                            {co.description}
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
                                                            <div className={`${layout.cellBox} ${layout.mutedBold} ${layout.outcomeIloCell}`}>
                                                                {ilo.id}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.readable} ${layout.outcomeIloCell}`}>
                                                                {ilo.description}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.muted} ${layout.outcomeIloCell}`}>
                                                                {ilo.hours}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div className={`${layout.cellBox} ${layout.muted} ${layout.outcomeIloCell}`}>
                                                                {ilo.percentage}
                                                            </div>
                                                        </td>
                                                    <td>
                                                        <div className={`${layout.cellBox} ${layout.outcomeIloCell}`}>
                                                            <input
                                                                 className={`${layout.point} ${layout.input} ${errorFields[`oo-items-${coIndex}-${iloIndex}`] ? layout.inputError : ''}`}
                                                                 type="text"
                                                                 inputMode="numeric"
                                                                 readOnly
                                                                 value={ilo.items}
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
                                className={layout.fixBtn}
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
                            <button className={layout.fixBtn} onClick={handleClearAll}>
                                Yes, clear all
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showApproveConfirm && (
                <div className={layout.modalOverlay} onClick={() => { setShowApproveConfirm(false); setApproveLoading(false); }}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Approve TOS</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => { setShowApproveConfirm(false); setApproveLoading(false); }}>×</span>
                        </div>
                        <div className={layout.modalBody}>
                            {comments.length > 0 ? (
                                <p style={{ color: "#555" }}>Comments will be discarded. Proceed to approval?</p>
                            ) : (
                                <p style={{ color: "#555" }}>Approve this TOS?</p>
                            )}
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} onClick={() => { setShowApproveConfirm(false); setApproveLoading(false); }}>Cancel</button>
                            <button className={layout.confirmBtn} onClick={handleConfirmApprove}>
                                {comments.length > 0 ? 'Proceed to approval' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showApproveCountdown && (
                <div className={layout.modalOverlay} onClick={() => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); setShowApproveCountdown(false); setApproveLoading(false); }}>
                    <div className={previewLayout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={previewLayout.confirmTextRow}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19282C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <p className={previewLayout.confirmText}>{comments.length > 0 ? 'Approving TOS (comments will be discarded)' : 'Approving TOS'}</p>
                        </div>
                        <div className={previewLayout.spinner} />
                        <span className={previewLayout.countdown}>{approveCountdown}s</span>
                        <button className={previewLayout.undoBtn} onClick={() => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); setShowApproveCountdown(false); setApproveLoading(false); }}>Undo</button>
                    </div>
                </div>
            )}

            {showReturnConfirm && (
                <div className={layout.modalOverlay} onClick={() => { setShowReturnConfirm(false); setReturnLoading(false); }}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3 style={{ color: "#1A1A1A" }}>Return TOS</h3>
                            <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => { setShowReturnConfirm(false); setReturnLoading(false); }}>×</span>
                        </div>
                        <div className={layout.modalBody}>
                            <p style={{ color: "#555" }}>Return this TOS with comments?</p>
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} onClick={() => { setShowReturnConfirm(false); setReturnLoading(false); }}>Cancel</button>
                            <button className={layout.confirmBtn} onClick={handleConfirmReturn}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReturnCountdown && (
                <div className={layout.modalOverlay} onClick={() => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); setShowReturnCountdown(false); setReturnLoading(false); }}>
                    <div className={previewLayout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={previewLayout.confirmTextRow}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#19282C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <p className={previewLayout.confirmText}>Returning TOS with comments</p>
                        </div>
                        <div className={previewLayout.spinner} />
                        <span className={previewLayout.countdown}>{returnCountdown}s</span>
                        <button className={previewLayout.undoBtn} onClick={() => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); setShowReturnCountdown(false); setReturnLoading(false); }}>Undo</button>
                    </div>
                </div>
            )}

            {showHistoryLog && (() => {
                const data = historyData[courseCode];
                const version = data?.versions?.find(v => v.version === selectedVersion);
                return (
                    <div className={layout.modalOverlay} onClick={() => setShowHistoryLog(false)}>
                        <div className={`${layout.modal} ${layout.historyModal}`} onClick={e => e.stopPropagation()}>
                            <div className={layout.modalHeader}>
                                <h3 style={{ color: "#1A1A1A", margin: 0 }}>History Log</h3>
                                <span style={{ cursor: "pointer", fontSize: "20px", color: "#999" }} onClick={() => setShowHistoryLog(false)}>×</span>
                            </div>
                            <div className={layout.historyContent}>
                                <div className={layout.historyLeft}>
                                    <select className={layout.historyPageSelect} value={historyPage} onChange={e => setHistoryPage(e.target.value)}>
                                        <option value="tosReport">Table of Specifications Report</option>
                                        <option value="assessmentItems">Assessment Items</option>
                                    </select>
                                    {historyPage === 'tosReport' && (() => {
                                        const totalHours = rows.reduce((s, r) => s + (r.totalHours || 0), 0);
                                        const totalPercentage = Math.min(rows.reduce((s, r) => s + (r.totalPercentage || 0), 0), 100);
                                        const totalItems = rows.reduce((s, r) => s + (r.totalItems || 0), 0);
                                        const totalCognitive = cognitiveLevels.map(level =>
                                            rows.reduce((sum, r) => sum + r.ilos.reduce((s, ilo) => {
                                                const items = (questions || []).filter(q => q.co === r.co && q.ilo === ilo.id && q.cognitiveLevel === level);
                                                return s + items.reduce((p, it) => p + (it.span || 1) * (it.points || 0), 0);
                                            }, 0), 0)
                                        );
                                        return (
                                        <div className={previewLayout.tableWrapper}>
                                            <div className={previewLayout.headerFields} style={{ marginBottom: 20 }}>
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
                                                    {rows.map(co => {
                                                        const agg = (() => {
                                                            const d = { items: {} };
                                                            co.ilos.forEach(ilo => { d.items[ilo.id] = {}; });
                                                            questions.forEach(q => {
                                                                if (q.co === co.co && d.items[q.ilo]) {
                                                                    const lv = q.cognitiveLevel || '';
                                                                    if (!d.items[q.ilo][lv]) d.items[q.ilo][lv] = [];
                                                                    d.items[q.ilo][lv].push(q);
                                                                }
                                                            });
                                                            return d;
                                                        })();
                                                        return (
                                                        <React.Fragment key={co.co}>
                                                            <tr data-tos-row={co.co}>
                                                                 <td><div className={previewLayout.cellBox} style={{ fontWeight: 'bold' }}>{co.co}<InfoBadge text={co.description} /></div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalHours || 0}</div></td>
                                                                <td><div className={previewLayout.cellBox}>{co.totalPercentage || 0}</div></td>
                                                                  <td><div className={previewLayout.cellBox}>{co.totalItems || 0}</div></td>
                                                                  {cognitiveLevels.map(level => (
                                                                     <td key={level}></td>
                                                                 ))}
                                                             </tr>
                                                            {co.ilos.map(ilo => {
                                                                return (
                                                                <tr data-tos-row={`${co.co}-${ilo.id}`} key={`${co.co}-${ilo.id}`}>
                                                                    <td><div className={`${previewLayout.cellBox} ${previewLayout.mutedBold}`}>{ilo.id}<InfoBadge text={ilo.description} /></div></td>
                                                                    <td><div className={`${previewLayout.cellBox} ${previewLayout.muted}`}>{ilo.hours || 0}</div></td>
                                                                    <td><div className={`${previewLayout.cellBox} ${previewLayout.muted}`}>{ilo.percentage || 0}</div></td>
                                                                    <td><div className={`${previewLayout.cellBox} ${previewLayout.muted}`}>{ilo.items || 0}</div></td>
                                                                    {cognitiveLevels.map(level => {
                                                                        const items = (agg?.items?.[ilo.id]?.[level] || []);
                                                                        return (
                                                                            <td key={level}>
                                                                                <div className={previewLayout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
                                                                                    {items.length === 0 ? '\u2014' : items.map((item, i) => (
                                                                                        <span key={i}>{item.span || 1} x {item.points || 0}</span>
                                                                                    ))}
                                                                                </div>
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            )})}
                                                            <tr key={`${co.co}-spacer`} style={{ height: '16px' }} />
                                                        </React.Fragment>
                                                    )})}
                                                    <tr data-tos-row="Total" style={{ fontWeight: '500' }}>
                                                        <td><div className={previewLayout.cellBox}>Total</div></td>
                                                        <td><div className={previewLayout.cellBox}>{totalHours}</div></td>
                                                        <td><div className={previewLayout.cellBox}>{totalPercentage}</div></td>
                                                        <td><div className={previewLayout.cellBox}>{totalItems}</div></td>
                                                        {totalCognitive.map((total, index) => (
                                                            <td key={index}><div className={previewLayout.cellBox}>{total}</div></td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        );
                                    })()}
                                    ) : (
                                        <div className={previewLayout.tableWrapper}>
                                            <div className={layout.viewToggleRow}>
                                                <span className={layout.assessmentLabel}>Assessment: {assessmentName || 'Written Exam'}</span>
                                                <div className={layout.viewToggleGroup}>
                                                    <div className={layout.viewToggleSlider} style={{ transform: `translateX(${historyViewMode === 'normal' ? '0' : 'calc(100% + 2px)'})` }} />
                                                    <button className={`${layout.viewToggleBtn} ${historyViewMode === 'normal' ? layout.viewToggleActive : ''}`} onClick={() => setHistoryViewMode('normal')}>List</button>
                                                    <button className={`${layout.viewToggleBtn} ${historyViewMode === 'group' ? layout.viewToggleActive : ''}`} onClick={() => setHistoryViewMode('group')}>Grouped</button>
                                                </div>
                                            </div>
                                            <div className={previewLayout.assessmentList}>
                                                {questions.length === 0 ? (
                                                    <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>No assessment items yet</div>
                                                ) : historyViewMode === 'normal' ? (
                                                    (() => {
                                                        let numCounter = 0;
                                                        const numMap = {};
                                                        questions.forEach(q => {
                                                            numMap[q.id] = numCounter + 1;
                                                            numCounter += (q.span || 1);
                                                        });
                                                        return questions.map(q => {
                                                            const start = numMap[q.id];
                                                            const end = start + (q.span || 1) - 1;
                                                            const label = start === end ? String(start) : `${start}\u2013${end}`;
                                                            return (
                                                                <div key={q.id} className={`${previewLayout.assessmentItem} ${layout.assessmentCard}`}>
                                                                    <div className={previewLayout.assessmentQuestion}>
                                                                        <span className={previewLayout.questionNumber}>{label}.</span>
                                                                        <span className={previewLayout.questionText}>{q.question || q.instruction || '(no question)'}</span>
                                                                    </div>
                                                                    {q.choices?.length > 0 && (
                                                                        <div className={`${previewLayout.assessmentChoices}${q.choices.every(c => (c.text || '').length < 30) ? ` ${previewLayout.choicesGrid}` : ''}`}>
                                                                            {q.choices.map((choice, ci) => (
                                                                                <div key={choice.id || ci} className={previewLayout.choiceRow}>
                                                                                    <span className={previewLayout.choiceLetter}>{String.fromCharCode(65 + ci)}.</span>
                                                                                    <span className={previewLayout.choiceText}>{choice.text || ''}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {q.rubricRows?.length > 0 && (
                                                                        <div className={previewLayout.rubricBox}>
                                                                            <div className={previewLayout.rubricHeader}><span className={previewLayout.rubricLabel}>Rubrics</span></div>
                                                                            <div className={previewLayout.rubricTable}>
                                                                                <div className={`${previewLayout.rubricRow} ${previewLayout.rubricHeaderRow}`}>
                                                                                    <span className={previewLayout.rubricName}>Criteria</span>
                                                                                    <span className={previewLayout.rubricDesc}>Description</span>
                                                                                    <span className={previewLayout.rubricWeight}>Weight</span>
                                                                                    <span className={previewLayout.rubricPts}>Pts</span>
                                                                                </div>
                                                                                {(() => {
                                                                                    const tp = Number(q.points) || 0;
                                                                                    const raw = q.rubricRows.map(r => Math.round(tp * Number(r.weight || 0) / 100));
                                                                                    const sum = raw.slice(0, -1).reduce((s, v) => s + v, 0);
                                                                                    const rp = [...raw.slice(0, -1), Math.max(0, tp - sum)];
                                                                                    const tw = q.rubricRows.reduce((s, r) => s + Number(r.weight || 0), 0);
                                                                                    return (
                                                                                        <>
                                                                                            {q.rubricRows.map((row, ri) => (
                                                                                                <div key={row.id || ri} className={previewLayout.rubricRow}>
                                                                                                    <span className={previewLayout.rubricName}>{row.name || row.criteria || ''}</span>
                                                                                                    <span className={previewLayout.rubricDesc}>{row.description || ''}</span>
                                                                                                    <span className={previewLayout.rubricWeight}>{Math.round(Number(row.weight) || 0)}%</span>
                                                                                                    <span className={previewLayout.rubricPts}>{rp[ri]}</span>
                                                                                                </div>
                                                                                            ))}
                                                                                            <div className={`${previewLayout.rubricRow} ${previewLayout.rubricTotalRow}`}>
                                                                                                <span className={previewLayout.rubricName}><strong>Total</strong></span>
                                                                                                <span className={previewLayout.rubricDesc}></span>
                                                                                                <span className={previewLayout.rubricWeight}>{Math.round(tw)}%</span>
                                                                                                <span className={previewLayout.rubricPts}><strong>{tp}</strong></span>
                                                                                            </div>
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })()
                                                ) : (
                                                    (() => {
                                                        const g = {};
                                                        questions.forEach(q => {
                                                            const c = q.co || '?'; const l = q.ilo || '?'; const v = q.cognitiveLevel || '?';
                                                            if (!g[c]) g[c] = {};
                                                            if (!g[c][l]) g[c][l] = {};
                                                            if (!g[c][l][v]) g[c][l][v] = [];
                                                            g[c][l][v].push(q);
                                                        });
                                                        let num = 0;
                                                        const nm = {};
                                                        questions.forEach(q => { nm[q.id] = num + 1; num += (q.span || 1); });
                                                        return Object.keys(g).map(coKey => (
                                                            <div key={coKey} className={layout.coGroup}>
                                                                <div className={layout.coHeader}><span className={layout.coTitle}>{coKey}</span></div>
                                                                {Object.keys(g[coKey]).map(iloKey => (
                                                                    <div key={iloKey} className={layout.iloGroup}>
                                                                        <div className={layout.iloHeader}><span className={layout.iloTitle}>{iloKey}</span></div>
                                                                        {Object.keys(g[coKey][iloKey]).map(cog => (
                                                                            <div key={cog} className={layout.cogGroup}>
                                                                                <div className={layout.cogHeader}><span>{cog}</span></div>
                                                                                {g[coKey][iloKey][cog].map(q => {
                                                                                    const s = nm[q.id];
                                                                                    const e = s + (q.span || 1) - 1;
                                                                                    const lb = s === e ? String(s) : `${s}\u2013${e}`;
                                                                                    return (
                                                                                        <div key={q.id} className={`${previewLayout.assessmentItem} ${layout.assessmentCard}`}>
                                                                                            <div className={previewLayout.assessmentQuestion}>
                                                                                                <span className={previewLayout.questionNumber}>{lb}.</span>
                                                                                                <span className={previewLayout.questionText}>{q.question || q.instruction || '(no question)'}</span>
                                                                                            </div>
                                                                                            {q.choices?.length > 0 && (
                                                                                                <div className={`${previewLayout.assessmentChoices}${q.choices.every(c => (c.text || '').length < 30) ? ` ${previewLayout.choicesGrid}` : ''}`}>
                                                                                                    {q.choices.map((choice, ci) => (
                                                                                                        <div key={choice.id || ci} className={previewLayout.choiceRow}>
                                                                                                            <span className={previewLayout.choiceLetter}>{String.fromCharCode(65 + ci)}.</span>
                                                                                                            <span className={previewLayout.choiceText}>{choice.text || ''}</span>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ));
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className={layout.historyRight}>
                                    <div className={layout.historyVersionTabs}>
                                        {data?.versions?.map(v => (
                                            <button key={v.version} className={`${layout.historyVersionTab} ${selectedVersion === v.version ? layout.historyVersionActive : ''}`} onClick={() => setSelectedVersion(v.version)}>
                                                Version {v.version}
                                            </button>
                                        ))}
                                    </div>
                                    <div className={layout.historyTimeline}>
                                        {version?.actions?.map((a, i) => (
                                            <div key={i} className={`${layout.historyAction} ${a.action?.includes('returned') ? layout.historyActionReturn : ''}`}>
                                                <div className={layout.historyDot} />
                                                <div className={layout.historyActionContent}>
                                                    <p><strong>{a.role}</strong> {a.action} on <strong>{a.date}</strong></p>
                                                    {a.comments?.map((c, ci) => (
                                                        <div key={ci} className={layout.historyComment}>
                                                            <div className={layout.historyCommentLabel}>{c.scope?.co} → {c.scope?.ilo} → {c.scope?.cognitiveLevel}</div>
                                                            <p>{c.body}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </>
    );
};

export default TosSections;