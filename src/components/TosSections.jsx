import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft, ChevronRight, ChevronUp, Loader, Trash2, CheckCircle, RotateCcw, Download, Clock, AlertTriangle, Send, MessageSquare, Plus, Eye, X, Check} from 'react-feather';
import React, {useCallback, useEffect, useRef, useState} from "react";
import {useNavigate, useSearchParams, useLocation, useParams} from "react-router-dom";
import layout from "../styles/TosSections.module.sass";
import previewLayout from "../styles/TosPreview.module.sass";
import TOSPreview from "../pages/TosPreview.jsx";
import TOSSummary from "../pages/TosSummary.jsx";
import AssessmentsStep, { AutoResizeTextarea } from "../pages/AssessmentsStep.jsx";
import AssessmentOutput from "./AssessmentOutput.jsx";
import { fetchOutcomes, fetchItems, saveOutcomes, saveItems, fetchCourse, updateCourse, updateStatus, fetchStatus, fetchComments, createComment, deleteComment, resolveComment, fetchAttachments, ACTIVE_PERIOD } from '../services/api.js';
import { PROGRAM_HEAD, INSTRUCTOR } from '../constants/users.js';

const BLOOM_LEVELS = [
    'Remembering', 'Understanding', 'Applying',
    'Analyzing', 'Evaluating', 'Creating'
];

const TosSections = ({role = 'instructor'}) => {

    const [questions, setQuestions] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [assessmentMode] = useState("question");
    const [expandedCOs, setExpandedCOs] = useState(new Set());
    const [expandedILOs, setExpandedILOs] = useState(new Set());
    const [viewMode, setViewMode] = useState('normal');
    const [lastClickedItemId, setLastClickedItemId] = useState(null);
    const [viewItemsTarget, setViewItemsTarget] = useState(null);
    const [navTargetScope, setNavTargetScope] = useState(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isProgramHead = role === 'program-head';
    const [phSection, setPhSection] = useState('Table of Specifications Report');
    const location = useLocation();
    const { code: courseCode } = useParams();
    const [effectiveStatus, setEffectiveStatus] = useState(location.state?.tosStatus || 'draft');
    const [deadline, setDeadline] = useState(null);
    const readOnly = !isProgramHead && (effectiveStatus === 'pending' || effectiveStatus === 'approved');
    const isReturnedView = isProgramHead && effectiveStatus === 'returned';
    const isInstructorReturned = !isProgramHead && effectiveStatus === 'returned';
    const isOverdue = effectiveStatus !== 'approved' && deadline && new Date(deadline) < new Date();
    const defaultSection = isProgramHead || effectiveStatus === 'pending' || effectiveStatus === 'approved'
        ? 'Table of Specifications Report'
        : effectiveStatus === 'returned'
            ? 'Assessments'
            : 'Outcome Overview';
    const selectedSection = isProgramHead ? phSection : (searchParams.get('section') || defaultSection);
    const getDefaultOutlines = () => [
        {
            co: "CO1",
            description: "Course Outcome 1",
            topics: [],
            totalHours: 20,
            totalPercentage: 100,
            totalPoints: 20,
            ilos: [
                { id: "ILO1", description: "ILO1", hours: 4, percentage: 20, items: 4 },
                { id: "ILO2", description: "ILO2", hours: 6, percentage: 30, items: 6 },
                { id: "ILO3", description: "ILO3", hours: 10, percentage: 50, items: 10 }
            ]
        },
        {
            co: "CO2",
            description: "Course Outcome 2",
            topics: [],
            totalHours: 20,
            totalPercentage: 100,
            totalPoints: 30,
            ilos: [
                { id: "ILO1", description: "ILO1", hours: 4, percentage: 20, items: 6 },
                { id: "ILO2", description: "ILO2", hours: 6, percentage: 30, items: 9 },
                { id: "ILO3", description: "ILO3", hours: 10, percentage: 50, items: 15 }
            ]
        }
    ];
    const courseName = location.state?.courseName || '';
    const fromExamType = location.state?.examType || ACTIVE_PERIOD;
    const fromSchoolYear = location.state?.schoolYear || String(new Date().getFullYear());
    const fromSemester = location.state?.semester || '1st Semester';
    const [courseNameState, setCourseName] = useState(courseName);
    const [assessmentName, setAssessmentName] = useState('');
    const defaultRows = getDefaultOutlines();

    const [rows, setRows] = useState(defaultRows);
    const [tosTotalPoints, setTosTotalPoints] = useState(50);
    const [tosTotalError, setTosTotalError] = useState('');
    window.tosTotalPoints = tosTotalPoints; // suppress unused
    const [dataLoaded, setDataLoaded] = useState(false);
    const [errorFields, setErrorFields] = useState({});
    const [exportErrors, setExportErrors] = useState({ outcomeOverview: [], assessmentMapping: [], tosSummary: [] });
    const [showExportErrorModal, setShowExportErrorModal] = useState(false);
    const [showHistoryLog, setShowHistoryLog] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState(1);
    const [collapsedVersions, setCollapsedVersions] = useState({});
    const [historyPage, setHistoryPage] = useState('tosReport');
    const [courseInstructor, setCourseInstructor] = useState('');
    const [statusTimestamps, setStatusTimestamps] = useState({ createdAt: null, submittedAt: null, returnedAt: null, approvedAt: null });
    const historyModalRef = useRef(null);
    const historyPrevFocusRef = useRef(null);
    useEffect(() => {
        if (!showHistoryLog) return;
        setCollapsedVersions({});
        historyPrevFocusRef.current = document.activeElement;
        historyModalRef.current?.focus();
        return () => {
            const prev = historyPrevFocusRef.current;
            if (prev && typeof prev.focus === 'function') prev.focus();
        };
    }, [showHistoryLog]);
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
                        { scope: { co: 'CO1', ilo: 'ILO1', cognitiveLevel: 'Understanding' }, body: 'The modulation items cover amplitude and frequency but lack phase modulation examples. Add at least two items on PSK and QAM techniques.' },
                        { scope: { co: 'CO1', ilo: 'ILO2', cognitiveLevel: 'Analyzing' }, body: 'Clarify the comparison between OSPF and BGP routing protocols. Include a practical network topology scenario.' },
                        { scope: { co: 'CO1', ilo: 'ILO3', cognitiveLevel: 'Evaluating' }, body: 'The CRC section needs more depth. Add items on polynomial division and syndrome calculation.' },
                        { scope: { co: 'CO2', ilo: 'ILO1', cognitiveLevel: 'Understanding' }, body: 'IP addressing items should include VLSM subnetting problems. Currently only basic subnet masks are covered.' },
                        { scope: { co: 'CO2', ilo: 'ILO3', cognitiveLevel: 'Creating' }, body: 'Network troubleshooting items lack practical scenarios. Add a lab-based item diagnosing connectivity from Wireshark captures.' }
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
            if (course?.instructor) setCourseInstructor(course.instructor);
            const periodTos = fromExamType === 'Finals' ? course?.finalsTos : course?.midtermTos;
            if (periodTos?.status) setEffectiveStatus(periodTos.status);
            else if (course?.tosStatus?.status) setEffectiveStatus(course.tosStatus.status);
            const d = fromExamType === 'Finals' ? course?.finalsDeadline : course?.midtermDeadline;
            if (d) setDeadline(d);
        }).catch(() => {});

        fetchOutcomes(courseCode).then(data => {
            if (!data) throw new Error('no data');
            const mapped = data.map(o => ({
                dbId: o.id,
                co: o.co,
                description: o.description || '',
                topics: (o.topics && o.topics !== '[]') ? JSON.parse(o.topics) : [],
                totalHours: (o.ilos || []).reduce((s, i) => s + (i.hours || 0), 0),
                totalPercentage: (o.ilos || []).reduce((s, i) => s + (i.percentage || 0), 0),
                totalPoints: (o.ilos || []).reduce((s, i) => s + (i.items || 0), 0),
                ilos: (o.ilos || []).map((ilo, idx) => ({
                    id: `ILO${idx + 1}`,
                    iloDbId: ilo.id,
                    description: ilo.description || '',
                    hours: ilo.hours || 0,
                    percentage: ilo.percentage || 0,
                    items: ilo.items || 0,
                    assessmentTool: ilo.assessmentTool || ilo.assessment_tool || ''
                }))
            }));
            // sync COs to a single TOS total
            let filteredMapped = mapped;
            if (fromExamType === 'Midterm') {
                filteredMapped = mapped.filter(co => co.co === 'CO1' || co.co === 'CO2');
            } else if (fromExamType === 'Finals') {
                filteredMapped = mapped.filter(co => co.co === 'CO3' || co.co === 'CO4');
            }
            if (filteredMapped.length === 0) filteredMapped = mapped;
            
            const tosTotal = filteredMapped.reduce((s, co) => s + co.totalPoints, 0);
            setTosTotalPoints(tosTotal);
            const numCOs = filteredMapped.length;
            const evenSplit = Math.floor(tosTotal / numCOs);
            
            const synced = filteredMapped.map((co, idx) => {
                const coTotal = (idx === numCOs - 1) ? (tosTotal - (evenSplit * (numCOs - 1))) : evenSplit;
                return {
                    ...co,
                    totalPoints: coTotal,
                    ilos: redistIloItems(co.ilos, coTotal)
                };
            });
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
        fetchItems(courseCode, fromExamType).then(data => {
            if (data && data.length) {
                const lookup = iloLookupRef.current;
                setQuestions(data.map(q => {
                    const info = lookup[q.iloId] || {};
                    return { ...q, co: info.co || q.iloItem?.outcome?.co || '', ilo: info.iloLabel || '' };
                }));
            }
        }).catch(() => {});
        fetchComments(courseCode, fromExamType).then(data => {
            if (data && data.length) {
                setComments(data.map(c => ({
                    id: c.id,
                    scope: { co: c.co, ilo: c.ilo, cognitiveLevel: c.cognitiveLevel, filename: (!BLOOM_LEVELS.includes(c.cognitiveLevel) && c.cognitiveLevel !== 'Points' && c.cognitiveLevel !== 'Number of Items') ? c.cognitiveLevel : '', itemNumber: c.itemNumber, courseOutcomeId: c.courseOutcomeId, assessmentItemId: c.assessmentItemId, returnNumber: c.returnNumber || 0 },
                    type: c.type,
                    body: c.body,
                    resolved: c.resolved || false,
                    timestamp: new Date(c.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' ' + new Date(c.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                })));
            }
        }).catch(() => {});
        fetchStatus(courseCode, fromExamType).then(s => {
            if (s) {
                if (s.status) setEffectiveStatus(s.status);
                if (s.deadline) setDeadline(s.deadline);
                setReturnCount(s.returnCount || 0);
                setStatusTimestamps({
                    createdAt: s.created_at || s.createdAt || null,
                    submittedAt: s.submittedAt || s.submitted_at || null,
                    returnedAt: s.returnedAt || s.returned_at || null,
                    approvedAt: s.approvedAt || s.approved_at || null
                });
                try { setReturnDates(JSON.parse(s.returnDates || '[]')); } catch { /* ignore */ }
            }
        }).catch(() => {});
        fetchAttachments(courseCode, fromExamType).then(data => {
            setAttachments(data || []);
        }).catch(() => {
            setAttachments([]);
        });
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

    // Every point row belongs to a file: rows whose file is missing are attached to the first
    // file of their ILO. (If the ILO has no file yet, the row stays unattached until one is uploaded.)
    useEffect(() => {
        if (!attachments.length) return;
        const attIds = new Set(attachments.map(a => Number(a.id)));
        const firstAttByIlo = new Map();
        attachments.forEach(a => {
            const key = Number(a.iloId);
            if (!firstAttByIlo.has(key)) firstAttByIlo.set(key, a.id);
        });
        setQuestions(prev => {
            let changed = false;
            const next = prev.map(q => {
                if (q.attachmentId != null && attIds.has(Number(q.attachmentId))) return q;
                const target = firstAttByIlo.get(Number(q.iloId));
                if (target === undefined) return q;
                changed = true;
                return { ...q, attachmentId: target };
            });
            return changed ? next : prev;
        });
    }, [attachments, questions]);

    useEffect(() => {
        if (isReturnedView || isInstructorReturned) setShowComment(true);
    }, [isReturnedView, isInstructorReturned]);

    const clearFieldError = (key) => {
        setErrorFields(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    // ── Outcome Overview helpers ──────────────────────────────────────────────

    // Helpers: redistribute ILO points within a CO using (hours × percentage) ratio
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

            // ONLY when it would produce a target below 1, apply adjustment so every target is >= 1 and sum stays exact
            const hasBelowOne = newIlos.some(ilo => ilo.items < 1);
            if (hasBelowOne && total >= newIlos.length) {
                newIlos.forEach(ilo => {
                    if (ilo.items < 1) ilo.items = 1;
                });
                let diff = total - newIlos.reduce((s, ilo) => s + (ilo.items || 0), 0);
                while (diff !== 0) {
                    if (diff > 0) {
                        newIlos[newIlos.length - 1].items += 1;
                        diff--;
                    } else {
                        let maxIdx = -1;
                        let maxVal = 1;
                        newIlos.forEach((ilo, idx) => {
                            if (ilo.items > maxVal) {
                                maxVal = ilo.items;
                                maxIdx = idx;
                            }
                        });
                        if (maxIdx >= 0) {
                            newIlos[maxIdx].items -= 1;
                            diff++;
                        } else {
                            break;
                        }
                    }
                }
            }
        } else {
            newIlos.forEach(ilo => { ilo.items = 0; });
        }
        return newIlos;
    };

    // The total is split equally between the COs of the current exam period.
    const handleTotalPointsChange = (value) => {
        const cleaned = value.replace(/[^0-9]/g, '');
        const numCos = rows.length || 1;
        const maxAllowed = 300 * numCos;
        let minTotal = 0;
        while (minTotal < maxAllowed) {
            const b = Math.floor(minTotal / numCos);
            const r = minTotal % numCos;
            if (rows.every((co, idx) => (b + (idx < r ? 1 : 0)) >= (co.ilos || []).length)) {
                break;
            }
            minTotal++;
        }

        if (value !== cleaned || (cleaned !== '' && Number(cleaned) <= 0)) {
            setTosTotalError('Must be a positive whole number');
        } else if (cleaned !== '' && Number(cleaned) > maxAllowed) {
            setTosTotalError(`Total points cannot exceed ${maxAllowed} (maximum 300 points per CO)`);
        } else if (cleaned !== '' && Number(cleaned) < minTotal) {
            setTosTotalError(`Total points must be at least ${minTotal} to give each ILO at least 1 point`);
        } else {
            setTosTotalError('');
        }
        
        const totalTos = cleaned === "" ? 0 : Number(cleaned);
        setTosTotalPoints(cleaned === "" ? "" : totalTos);

        setRows(prev => {
            const numCos = prev.length || 1;
            const base = Math.floor(totalTos / numCos);
            const rem = totalTos % numCos;
            
            return prev.map((co, idx) => {
                const coTotal = base + (idx < rem ? 1 : 0);
                return {
                    ...co,
                    totalPoints: coTotal,
                    ilos: redistIloItems(co.ilos, coTotal)
                };
            });
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
                if (counts[q.co] && counts[q.co].ilos[q.ilo] !== undefined) counts[q.co].ilos[q.ilo] += (Number(q.points) || 0);
            }
        });

        const ooSet = new Set();
        rows.forEach((co, coIndex) => {
            if (Number(co.totalPoints) > 300 || Number(co.totalPoints) === 0) {
                fieldKeys[`oo-totalPoints-${coIndex}`] = true;
            }
            co.ilos.forEach((ilo, iloIndex) => {
                if (Number(ilo.items) === 0) {
                    ooSet.add('Some ILOs have zero points');
                    fieldKeys[`oo-items-${coIndex}-${iloIndex}`] = true;
                } else if (Number(ilo.items) > 300) {
                    ooSet.add('Some ILOs exceed the maximum of 300 points');
                    fieldKeys[`oo-items-${coIndex}-${iloIndex}`] = true;
                }
            });
        });
        issues.outcomeOverview = [...ooSet];

        const mapSet = new Set();
        if (questions.length === 0) mapSet.add('No assessment points added');
        questions.forEach((q) => {
            const allowed = q.ilo === 'ILO1' ? ['Remembering', 'Understanding'] : q.ilo === 'ILO2' ? ['Applying', 'Analyzing'] : ['Evaluating', 'Creating'];
            if (!q.co) { mapSet.add('Some items have no CO selected'); fieldKeys[`map-co-${q.id}`] = true; }
            if (!q.ilo) { mapSet.add('Some items have no ILO selected'); fieldKeys[`map-ilo-${q.id}`] = true; }
            if (!q.points || Number(q.points) <= 0) { mapSet.add('A row is missing points'); fieldKeys[`map-points-${q.id}`] = true; }
            if (!q.cognitiveLevel) { mapSet.add("A row has no Bloom's level selected"); fieldKeys[`map-cognitiveLevel-${q.id}`] = true; } else if (!allowed.includes(q.cognitiveLevel)) { mapSet.add("A row has an invalid Bloom's level for its ILO"); fieldKeys[`map-cognitiveLevel-${q.id}`] = true; }
        });
        rows.forEach(co => {
            co.ilos.forEach(ilo => {
                if (!attachments.some(a => Number(a.iloId) === Number(ilo.iloDbId || ilo.id))) {
                    mapSet.add('Some ILOs have no file uploaded');
                }
            });
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
        if (hasAllocMismatch) mapSet.add('Points allocation does not match the required distribution');
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
        if (selectedSection !== 'Assessments') return;
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

    const handleSectionChange = (eOrValue) => {
        if (!confirmDiscard()) return;
        const val = typeof eOrValue === 'string' ? eOrValue : (eOrValue?.target?.value || eOrValue);
        setAddingComment(false);
        setActiveScope(null);
        setCommentBody('');
        if (isProgramHead) {
            setPhSection(val);
        } else {
            setSearchParams({ section: val });
        }
    };

    const isReviewMode = isReturnedView || isProgramHead || effectiveStatus === 'pending' || effectiveStatus === 'approved';
    const sectionSteps = isReviewMode ? [
        { id: 'Table of Specifications Report', label: 'Table of Specifications Report' },
        { id: 'Assessments', label: 'Assessments' }
    ] : [
        { id: 'Outcome Overview', label: 'Outcome Overview' },
        { id: 'Assessments', label: 'Assessments' },
        { id: 'TOS Summary', label: 'TOS Summary' }
    ];
    const currentStepIndex = Math.max(0, sectionSteps.findIndex(s => s.id === selectedSection));

    const handlePrevStep = () => {
        if (currentStepIndex > 0) {
            handleSectionChange(sectionSteps[currentStepIndex - 1].id);
        }
    };

    const handleNextStep = () => {
        if (currentStepIndex < sectionSteps.length - 1) {
            handleSectionChange(sectionSteps[currentStepIndex + 1].id);
        }
    };

    const [isLoading, setIsLoading] = useState(false);
    const [navigating, setNavigating] = useState(false);
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
    const isInstructorPendingWithComments = effectiveStatus === 'pending' && returnCount >= 2;
    const pastReturnMax = (isReturnedView || isInstructorReturned) ? returnCount - 1 : returnCount;
    const resolvedReturnNumbers = [...new Set(comments.filter(c => c.resolved && c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax).map(c => c.scope.returnNumber))];
    const defaultResolvedReturn = resolvedReturnNumbers.length > 0 ? String(Math.max(...resolvedReturnNumbers)) : 'all';
    const resolvedCurrentReturn = comments.filter(c => c.resolved && c.scope.returnNumber === returnCount);

    useEffect(() => {
        if (!isInstructorReturned) {
            if (selectedSection === 'Outcome Overview') setCommentCategory('outcomeOverview');
            else if (selectedSection === 'Assessments') setCommentCategory('alignment');
            else if (selectedSection === 'TOS Summary') setCommentCategory('alignment');
            setShowResolved(false);
            setShowResolvedPH(false);
        }
    }, [selectedSection, isInstructorReturned]);

    const handleResolveComment = async (id) => {
        try {
            await resolveComment(courseCode, fromExamType, id, true);
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
            await resolveComment(courseCode, fromExamType, id, false);
            setComments(prev => prev.map(c => c.id === id ? { ...c, resolved: false } : c));
            setRecentlyResolved(null);
            if (resolveTimerRef.current) clearTimeout(resolveTimerRef.current);
        } catch (err) {
            console.error('Failed to unresolve comment:', err);
        }
    };

    const filteredComments = comments.filter(c => {
        const isNumberItems = c.scope.cognitiveLevel === 'Points' || c.scope.cognitiveLevel === 'Number of Items';
        const hasItemNumber = !!c.scope.itemNumber;
        if (commentCategory === 'outcomeOverview') return isNumberItems && !hasItemNumber;
        if (commentCategory === 'assessmentItems') return hasItemNumber;
        return !isNumberItems && !hasItemNumber;
    });
    void filteredComments;

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
        if (!el || selectedSection !== 'Assessments') return;
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

    const formatScopeText = (s) => {
        if (!s) return '';
        const coPart = s.co || '';
        const iloPart = s.ilo && s.ilo !== '—' && s.ilo !== '-' ? ` → ${s.ilo}` : '';
        const rowId = s.assessmentItemId || s.rowId;
        if (rowId) {
            const item = questions.find(q => String(q.id) === String(rowId));
            const att = item
                ? attachments.find(a => Number(a.id) === Number(item.attachmentId))
                : (s.fileId ? attachments.find(a => Number(a.id) === Number(s.fileId)) : null);
            const iloObj = rows.find(r => r.co === s.co)?.ilos?.find(i => i.id === s.ilo);
            const fallbackAtt = !att && iloObj
                ? attachments.find(a => Number(a.iloId) === Number(iloObj.iloDbId))
                : null;
            const fn = s.filename || att?.filename || fallbackAtt?.filename || '';
            const rowCog = (BLOOM_LEVELS.includes(s.cognitiveLevel) ? s.cognitiveLevel : '') || item?.cognitiveLevel || '';
            if (fn) {
                return `${coPart}${iloPart} → ${fn}${rowCog ? ` → ${rowCog}` : ''}`;
            }
            return `${coPart}${iloPart}${rowCog ? ` → ${rowCog}` : ''}`;
        }
        const fn = s.filename || (!BLOOM_LEVELS.includes(s.cognitiveLevel) && s.cognitiveLevel !== 'Points' && s.cognitiveLevel !== 'Number of Items' && s.cognitiveLevel ? s.cognitiveLevel : null);
        if (fn) {
            return `${coPart}${iloPart} → ${fn}`;
        }
        const cogPart = s.cognitiveLevel === 'Number of Items' ? 'Points' : (s.cognitiveLevel || '');
        return `${coPart}${iloPart}${cogPart ? ` → ${cogPart}` : ''}`;
    };

    const handleViewAssessmentsJump = (t) => {
        if (!t) return;
        setViewItemsTarget(null);
        setNavTargetScope({ co: t.co, ilo: t.ilo, cognitiveLevel: t.cognitiveLevel, _ts: Date.now() });
        if (isProgramHead) setPhSection('Assessments');
        else setSearchParams({ section: 'Assessments' });
        viewItemsNavRef.current = true;
        setViewMode('group');
        const coSet = new Set(t.ilo && t.ilo !== '\u2014' ? questions.map(q => q.co).filter(Boolean) : [t.co]);
        const iloSet = t.ilo && t.ilo !== '\u2014' ? new Set([`${t.co}|${t.ilo}`]) : new Set();
        setExpandedCOs(coSet);
        setExpandedILOs(iloSet);
        setTimeout(() => {
            let scrollEl = null;
            let highlightEls = [];
            if (t.cognitiveLevel && t.cognitiveLevel !== 'Points') {
                const rows = document.querySelectorAll(`[data-co="${t.co}"][data-ilo="${t.ilo}"][data-cog="${t.cognitiveLevel}"]`);
                if (rows.length > 0) {
                    scrollEl = rows[0];
                    highlightEls = Array.from(rows);
                } else {
                    scrollEl = document.querySelector(`[data-ilo-header="${t.co}|${t.ilo}"]`) || document.getElementById(`co-header-${t.co}`);
                }
            } else if (t.ilo && t.ilo !== '\u2014') {
                const rows = document.querySelectorAll(`[data-co="${t.co}"][data-ilo="${t.ilo}"][data-item-id]`);
                if (rows.length > 0) {
                    scrollEl = rows[0];
                    highlightEls = Array.from(rows);
                } else {
                    scrollEl = document.querySelector(`[data-ilo-header="${t.co}|${t.ilo}"]`) || document.getElementById(`co-header-${t.co}`);
                }
            } else {
                scrollEl = document.getElementById(`co-header-${t.co}`) || document.querySelector(`[data-co="${t.co}"]`);
                const rows = document.querySelectorAll(`[data-co="${t.co}"][data-item-id]`);
                if (rows.length > 0) {
                    highlightEls = Array.from(rows);
                }
            }
            if (scrollEl) {
                scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            highlightEls.forEach(el => {
                if (previewLayout?.rowPulseHighlight) {
                    el.classList.add(previewLayout.rowPulseHighlight);
                    setTimeout(() => el.classList.remove(previewLayout.rowPulseHighlight), 2000);
                }
            });
        }, 400);
    };

    const handleCellClick = (co, ilo, cognitiveLevel, itemNumber, fks = {}) => {
        if (!addingComment) return;
        const scopeKey = `${co || '\u2014'}|${ilo || '\u2014'}|${cognitiveLevel || '\u2014'}|${itemNumber || ''}`;
        const currentKey = activeScope ? `${activeScope.co}|${activeScope.ilo}|${activeScope.cognitiveLevel}|${activeScope.itemNumber || ''}` : '';
        if (scopeKey === currentKey) return;
        setActiveScope({ co: co || '\u2014', ilo: ilo || '\u2014', cognitiveLevel: cognitiveLevel || '\u2014', itemNumber, courseOutcomeId: fks.courseOutcomeId || null, assessmentItemId: fks.assessmentItemId || null });
        setCommentType(itemNumber ? 'Question' : '');
        setCommentBody('');
    };

    const handleStartCommentFromPopup = (t) => {
        if (!t || !confirmDiscard()) return;
        setViewItemsTarget(null);
        setShowComment(true);
        setShowResolvedPH(false);
        setAddingComment(true);
        setActiveScope({
            co: t.co || '\u2014',
            ilo: t.ilo || '\u2014',
            cognitiveLevel: t.cognitiveLevel || '\u2014',
            itemNumber: undefined,
            courseOutcomeId: t.courseOutcomeId || null,
            assessmentItemId: null
        });
        setCommentType('');
        setCommentBody('');
    };

    const handleAssessmentFileClick = (att, co, ilo) => {
        if (!addingComment) return;
        setActiveScope({
            co: co.co || '\u2014',
            ilo: ilo.id || '\u2014',
            cognitiveLevel: att.filename || '',
            filename: att.filename,
            fileId: att.id,
            itemNumber: '',
            courseOutcomeId: co.dbId || null,
            assessmentItemId: null
        });
        setCommentType('');
        setCommentBody('');
    };

    const handleAssessmentRowClick = (att, co, ilo, row) => {
        if (!addingComment || !row) return;
        setActiveScope({
            co: co.co || '\u2014',
            ilo: ilo.id || '\u2014',
            cognitiveLevel: row.cognitiveLevel || '',
            filename: att?.filename || '',
            fileId: att?.id || null,
            itemNumber: '',
            rowId: row.id,
            courseOutcomeId: co.dbId || null,
            assessmentItemId: Number.isInteger(row.id) ? row.id : null
        });
        setCommentType('');
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
            const saved = await createComment(courseCode, fromExamType, payload);
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
            await deleteComment(courseCode, fromExamType, id);
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
    const allIlosComplete = rows.every(co => co.ilos.every(ilo => {
        const iloPoints = questions.filter(q => q.co === co.co && q.ilo === ilo.id).reduce((s, q) => s + (Number(q.points) || 0), 0);
        return iloPoints === (ilo.items || 0);
    }));
    const relevantQuestions = questions.filter(q => rows.some(co => co.co === q.co));
    const allItemsHavePoints = relevantQuestions.every(q => q.points && Number(q.points) > 0);
    const allItemsHaveBloom = relevantQuestions.every(q => !!q.cognitiveLevel);
    const relevantIloDbIds = new Set(rows.flatMap(co => (co.ilos || []).map(ilo => ilo.iloDbId || ilo.id)));
    const relevantAtts = attachments.filter(a => relevantIloDbIds.has(a.iloId));
    const allFilesHaveRows = relevantAtts.every(a => relevantQuestions.some(q => String(q.attachmentId) === String(a.id)));
    const iloHasFile = (ilo) => attachments.some(a => Number(a.iloId) === Number(ilo.iloDbId || ilo.id));
    const allIlosHaveFile = rows.every(co => (co.ilos || []).every(iloHasFile));
    const canSubmit = allIlosComplete && allItemsHavePoints && allItemsHaveBloom && allFilesHaveRows && allIlosHaveFile && relevantQuestions.length > 0 && comments.every(c => c.resolved);

    const getSubmitTooltipText = () => {
        if (canSubmit) return '';
        const lines = [];

        // (a) mismatch: "ILO1 needs 3 more points, ILO2 is 1 over" (up to 2 ILOs, then "+N more")
        const mismatchItems = [];
        // (b) an ILO with no file: "ILOn has no file uploaded" (up to 2 ILOs, "+N more")
        const noRowItems = [];

        rows.forEach(co => {
            (co.ilos || []).forEach(ilo => {
                const iloRows = questions.filter(q => q.co === co.co && q.ilo === ilo.id);
                const target = ilo.items || 0;
                if (!iloHasFile(ilo)) {
                    noRowItems.push(`${ilo.id} has no file uploaded`);
                }
                // An ILO that has a file but no rows is reported by (b.1) below
                if (iloRows.length > 0) {
                    const allocated = iloRows.reduce((s, q) => s + (Number(q.points) || 0), 0);
                    if (allocated < target) {
                        const diff = target - allocated;
                        mismatchItems.push(`${ilo.id} needs ${diff} more point${diff === 1 ? '' : 's'}`);
                    } else if (allocated > target) {
                        const diff = allocated - target;
                        mismatchItems.push(`${ilo.id} is ${diff} over`);
                    }
                }
            });
        });

        if (mismatchItems.length > 0) {
            if (mismatchItems.length > 2) {
                lines.push(`${mismatchItems.slice(0, 2).join(', ')}, +${mismatchItems.length - 2} more`);
            } else {
                lines.push(mismatchItems.join(', '));
            }
        }

        if (noRowItems.length > 0) {
            if (noRowItems.length > 2) {
                lines.push(`${noRowItems.slice(0, 2).join(', ')}, +${noRowItems.length - 2} more`);
            } else {
                lines.push(noRowItems.join(', '));
            }
        }

        // (b.1) empty file: "ILO1 has a file with no rows" (up to 2 ILOs, "+N more")
        const emptyFileItems = [];
        rows.forEach(co => {
            (co.ilos || []).forEach(ilo => {
                const iloDbId = ilo.iloDbId || ilo.id;
                const iloAtts = attachments.filter(a => a.iloId === iloDbId);
                if (iloAtts.length > 0 && iloAtts.some(a => !questions.some(q => String(q.attachmentId) === String(a.id)))) {
                    emptyFileItems.push(`${ilo.id} has a file with no rows`);
                }
            });
        });

        if (emptyFileItems.length > 0) {
            if (emptyFileItems.length > 2) {
                lines.push(`${emptyFileItems.slice(0, 2).join(', ')}, +${emptyFileItems.length - 2} more`);
            } else {
                lines.push(emptyFileItems.join(', '));
            }
        }

        // (c) "Some rows have no points or Bloom's level"
        if (relevantQuestions.some(q => !q.points || Number(q.points) <= 0 || !q.cognitiveLevel)) {
            lines.push("Some rows have no points or Bloom's level");
        }

        // (d) "Resolve all comments"
        if (comments.some(c => !c.resolved)) {
            lines.push("Resolve all comments");
        }

        // (e) "Add at least one assessment row"
        if (relevantQuestions.length === 0) {
            lines.push("Add at least one assessment row");
        }

        return lines.slice(0, 3).join('\n');
    };

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => { setIsLoading(false); }, 500);
        return () => clearTimeout(timer);
    }, [selectedSection]);

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

    // Demo-only: approved-course Export buttons download a placeholder PDF (no server call)
    const handleExportDemoPdf = () => {
        try {
            const safeName = String(courseCode || courseNameState || 'TOS').replace(/[\\/:*?"<>|]/g, '').trim() || 'TOS';
            const link = document.createElement('a');
            link.href = '/tos-sample.pdf';
            link.download = `TOS - ${safeName}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch {
            // demo placeholder download: nothing to recover
        }
    };

    const handleNavigateBack = async () => {
        setNavigating(true);
        if (courseCode) {
            const outcomesPayload = rows.map(r => ({
                id: r.dbId,
                co: r.co,
                description: r.description || '',
                totalItems: r.totalPoints || 0,
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
                    saveItems(courseCode, fromExamType, questions),
                    updateCourse(courseCode, { assessmentName })
                ]);
                const data = await fetchItems(courseCode, fromExamType);
                if (data) {
                    const lookup = iloLookupRef.current;
                    setQuestions(data.map(q => {
                        const info = lookup[q.iloId] || {};
                        return { ...q, co: info.co || q.iloItem?.outcome?.co || '', ilo: info.iloLabel || '' };
                    }));
                }
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
        const hasCurrentRoundComments = comments.some(c => (c.scope?.returnNumber || c.returnNumber) === returnCount + 1);
        if (!hasCurrentRoundComments) return;
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
            await updateStatus(courseCode, fromExamType, 'approved');
            setComments(prev => prev.filter(c => c.resolved));
            navigate('/role/program-head/tos', { state: { tosStatusUpdate: { courseCode, newStatus: 'approved' }, initialStatus: 'approved' } });
        }
    };

    const handleReturn = async () => {
        if (courseCode) {
            await updateStatus(courseCode, fromExamType, 'returned');
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
        const isFile = !!(c.scope.filename || c.scope.fileId || (c.scope.cognitiveLevel && !BLOOM_LEVELS.includes(c.scope.cognitiveLevel) && c.scope.cognitiveLevel !== 'Points' && c.scope.cognitiveLevel !== 'Number of Items'));
        if (isProgramHead && phSection !== 'Assessments') setPhSection('Assessments');
        else if (!isProgramHead && selectedSection !== 'Assessments') setSearchParams({ section: 'Assessments' });
        viewItemsNavRef.current = true;
        setViewMode('group');
        const coSet = new Set(c.scope.ilo && c.scope.ilo !== '\u2014' ? questions.map(q => q.co).filter(Boolean) : [c.scope.co]);
        const iloSet = c.scope.ilo && c.scope.ilo !== '\u2014' ? new Set([`${c.scope.co}|${c.scope.ilo}`]) : new Set();
        setExpandedCOs(coSet);
        setExpandedILOs(iloSet);
        setNavTargetScope({ co: c.scope.co, ilo: c.scope.ilo, cognitiveLevel: c.scope.cognitiveLevel, itemId: c.scope.assessmentItemId || null, _ts: Date.now() });
        setTimeout(() => {
            const co = c.scope.co;
            const ilo = c.scope.ilo;
            const cog = c.scope.cognitiveLevel;
            const itemId = c.scope.assessmentItemId || c.scope.rowId;
            const filename = c.scope.filename || (!itemId && isFile ? cog : null);
            let scrollEl = null;
            let highlightEls = [];

            if (itemId) {
                const rowEl = document.querySelector(`[data-item-id="${itemId}"]`);
                if (rowEl) {
                    scrollEl = rowEl;
                    highlightEls = [rowEl];
                }
            }
            if (!scrollEl && c.scope.fileId && !itemId) {
                const fileEl = document.querySelector(`[data-file-id="${c.scope.fileId}"]`);
                if (fileEl) {
                    scrollEl = fileEl;
                    highlightEls = [fileEl];
                }
            }
            if (!scrollEl && filename && !itemId) {
                const fileEl = document.querySelector(`[data-filename="${filename}"][data-co="${co}"][data-ilo="${ilo}"]`) ||
                               document.querySelector(`[data-filename="${filename}"]`);
                if (fileEl) {
                    scrollEl = fileEl;
                    highlightEls = [fileEl];
                }
            }
            if (!scrollEl && co && ilo && cog && BLOOM_LEVELS.includes(cog)) {
                const cogRows = document.querySelectorAll(`[data-co="${co}"][data-ilo="${ilo}"][data-cog="${cog}"]`);
                if (cogRows.length > 0) {
                    scrollEl = cogRows[0];
                    highlightEls = Array.from(cogRows);
                }
            }
            if (!scrollEl && co && ilo) {
                const fileCards = document.querySelectorAll(`[data-co="${co}"][data-ilo="${ilo}"][data-file-id]`);
                if (fileCards.length > 0) {
                    scrollEl = fileCards[0];
                    highlightEls = Array.from(fileCards);
                }
            }
            if (!scrollEl) {
                scrollEl = document.querySelector(`[data-ilo-header="${co}|${ilo}"]`) || document.getElementById(`co-header-${co}`);
                if (scrollEl) highlightEls = [scrollEl];
            }
            if (scrollEl) {
                scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            highlightEls.forEach(el => {
                if (previewLayout?.rowPulseHighlight) {
                    el.classList.add(previewLayout.rowPulseHighlight);
                    setTimeout(() => el.classList.remove(previewLayout.rowPulseHighlight), 2000);
                }
            });
        }, 450);
    };

    const openComments = comments.filter(c => !c.resolved);

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

                        <div className={styles.stepperNav}>
                            <button
                                type="button"
                                className={styles.stepperArrow}
                                onClick={handlePrevStep}
                                disabled={currentStepIndex === 0}
                                title="Previous section"
                                aria-label="Previous section"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <div className={styles.stepperCapsule} role="tablist" aria-label="TOS sections">
                                {sectionSteps.map((step, idx) => {
                                    const isCurrent = idx === currentStepIndex;
                                    const isCompleted = idx < currentStepIndex;
                                    return (
                                        <React.Fragment key={step.id}>
                                            {idx > 0 && <span className={styles.stepperDivider} aria-hidden="true">—</span>}
                                            <button
                                                type="button"
                                                role="tab"
                                                aria-selected={isCurrent}
                                                className={`${styles.stepperStep} ${
                                                    isCurrent ? styles.stepActive : isCompleted ? styles.stepCompleted : styles.stepUpcoming
                                                }`}
                                                onClick={() => handleSectionChange(step.id)}
                                            >
                                                {step.label}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                className={styles.stepperArrow}
                                onClick={handleNextStep}
                                disabled={currentStepIndex === sectionSteps.length - 1}
                                title="Next section"
                                aria-label="Next section"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                        {isOverdue && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', fontSize: 12, fontWeight: 600, color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: 9999, marginLeft: 8 }}>
                                <AlertTriangle size={12} color="#DC2626" aria-hidden="true" />
                                Overdue
                            </span>
                        )}

                        {isReturnedView ? (
                            <span className={styles.draft} style={{ color: '#999', cursor: 'default' }}>View Only</span>
                        ) : isProgramHead ? (
                            effectiveStatus === 'approved' ? (
                                <>
                                    <button className={styles.historyBtn} onClick={() => { setShowHistoryLog(true); setSelectedVersion(1); }}>
                                        <Clock size={16} /> History Log
                                    </button>
                                    <button className={styles.exportBtn} onClick={handleExportDemoPdf}>
                                        <Download size={16} /> Export
                                    </button>
                                </>
                            ) : effectiveStatus === 'pending' ? (
                                <>
                                    <div ref={commentBtnRef} className={`${styles.draft} ${layout.commentBtn} ${showComment ? layout.commentBtnActive : ''}`} onClick={toggleCommentPanel}>
                                        <MessageSquare size={15} />
                                        <span>Comments</span>
                                        {comments.filter(c => !c.resolved).length > 0 && (
                                            <span className={layout.commentCountBadge}>{comments.filter(c => !c.resolved).length}</span>
                                        )}
                                    </div>
                                    {showComment ? (
                                        <button
                                            className={layout.headerReturnBtn}
                                            disabled={!comments.some(c => (c.scope?.returnNumber || c.returnNumber) === returnCount + 1) || returnLoading}
                                            onClick={handleStartReturn}
                                        >
                                            {returnLoading ? <Loader size={16} className={layout.spinner} /> : <RotateCcw size={15} />}
                                            {returnLoading ? 'Returning…' : 'Return'}
                                        </button>
                                    ) : (
                                        <button className={styles.submit} onClick={handleStartApprove} disabled={approveLoading}>
                                            {approveLoading ? <Loader size={16} className={layout.spinner} /> : <CheckCircle size={15} />}
                                            {approveLoading ? 'Approving…' : 'Approve'}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <span className={styles.draft} style={{ color: '#999', cursor: 'default' }}>Draft (Not Submitted)</span>
                            )
                        ) : readOnly ? (
                            effectiveStatus === 'approved' ? (
                                <>
                                    <button className={styles.historyBtn} onClick={() => { setShowHistoryLog(true); setSelectedVersion(1); }}>
                                        <Clock size={16} /> History Log
                                    </button>
                                    <button className={styles.exportBtn} onClick={handleExportDemoPdf}>
                                        <Download size={16} /> Export
                                    </button>
                                </>
                            ) : (
                                <span className={styles.draft} style={{ color: '#999', cursor: 'default' }}>View Only</span>
                            )
                        ) : (
                        <>
                        <div className={styles.draft} onClick={handleNavigateBack}>
                            <CheckCircle size={15} /> Save as Draft
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
                                                totalItems: r.totalPoints || 0,
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
                                                saveItems(courseCode, fromExamType, questions),
                                                updateCourse(courseCode, { assessmentName })
                                            ]).then(async () => {
                                                try {
                                                    const data = await fetchItems(courseCode, fromExamType);
                                                    if (data) {
                                                        const lookup = iloLookupRef.current;
                                                        setQuestions(data.map(q => {
                                                            const info = lookup[q.iloId] || {};
                                                            return { ...q, co: info.co || q.iloItem?.outcome?.co || '', ilo: info.iloLabel || '' };
                                                        }));
                                                    }
                                                } catch { /* ignore */ }
                                                setSubmitLoading(false);
                                                submitGuardRef.current = false;
                                                setIsPreviewOpen(true);
                                            }).catch(() => {
                                                setSubmitLoading(false);
                                                submitGuardRef.current = false;
                                                setIsPreviewOpen(true);
                                            });
                                        } else {
                                            submitGuardRef.current = false;
                                            setIsPreviewOpen(true);
                                        }
                                    }}
                            >
                                {submitLoading ? <Loader size={16} className={layout.spinner} /> : <Send size={15} />}
                                {submitLoading ? 'Submitting…' : 'Submit'}
                            </button>
                            {!canSubmit && (
                                <span className={layout.tosSubmitTooltip}>{getSubmitTooltipText()}</span>
                            )}
                        </div>
                        </>
                        )}
                    </div>

                <div className={styles['dynamic-sections']} style={{ position: 'relative' }}>
                    {(navigating) && (
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
                                        const totalPoints = rows.reduce((sum, co) => sum + (co.totalPoints || 0), 0);
                                        const totalCognitive = cognitiveLevels.map(level => {
                                            return rows.reduce((sum, co) => {
                                                return sum + co.ilos.reduce((iloSum, ilo) => {
                                                    const items = aggregatedData[co.co][ilo.id][level];
                                                    return iloSum + items.reduce((s, item) => s + (Number(item.points) || 0), 0);
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
                                                        <input type="text" disabled className={previewLayout.numberInput} value={fromExamType || assessmentName} />
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
                                                        <th rowSpan={2} className={previewLayout.headerCell}>Points</th>
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
                                                                  <td className={`${layout.cellClickable}${isTargetCell(co.co, '\u2014', 'Points') ? ` ${layout.cellTargeted}` : ''}`} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: '\u2014', cognitiveLevel: 'Points', courseOutcomeId: co.dbId, top: r.bottom, left: r.left, width: r.width, isEmpty: !(co.totalPoints || 0) }); }}><div className={previewLayout.cellBox}>{co.totalPoints || 0}</div></td>
                                                                  {cognitiveLevels.map(level => (
                                                                     <td key={level} style={{ background: 'white' }}></td>
                                                                 ))}
                                                             </tr>
                                                              {co.ilos.map(ilo => (
                                                                  <tr key={ilo.id} data-tos-row={`${co.co}|${ilo.id}`}>
                                                                      <td><div className={previewLayout.cellBox}>{ilo.id}<InfoBadge text={ilo.description} /></div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.hours || 0}</div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.percentage || 0}</div></td>
                                                                        <td className={`${layout.cellClickable}${isTargetCell(co.co, ilo.id, 'Points') ? ` ${layout.cellTargeted}` : ''}`} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: 'Points', courseOutcomeId: co.dbId, top: r.bottom, left: r.left, width: r.width, isEmpty: !(ilo.items || 0) }); }}><div className={previewLayout.cellBox}>{ilo.items || 0}</div></td>
                                                                     {cognitiveLevels.map(level => {
const items = aggregatedData[co.co][ilo.id][level];
                                                                          return (
                                                                                 <td key={level} className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, level) ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, ilo.id, level) ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, ilo.id, level, undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: level, courseOutcomeId: co.dbId, top: r.bottom, left: r.left, width: r.width, isEmpty: items.length === 0 }); })()}>                                                                                  <div className={previewLayout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
                                                                                      {(() => { const pts = items.reduce((s, item) => s + (Number(item.points) || 0), 0); return pts > 0 ? <span className={previewLayout.pointValue}>{pts}</span> : <span className={previewLayout.emptyDash}>{'\u2014'}</span>; })()}



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
                                                           <td><div className={previewLayout.cellBox}>{totalPoints}</div></td>
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
                            {phSection === 'Assessments' && (
                                <section>
                                    <AssessmentOutput
                                        outcomeData={rows}
                                        questions={questions}
                                        courseCode={courseCode}
                                        period={fromExamType}
                                        targetScope={navTargetScope}
                                        addingComment={addingComment}
                                        activeScope={activeScope}
                                        onFileClick={handleAssessmentFileClick}
                                        onRowClick={handleAssessmentRowClick}
                                    />
                                </section>
                            )}
                            </div>
                            {displayTarget && (
                                <div className={`${layout.viewItemsOverlay}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} onClick={() => setViewItemsTarget(null)} />
                            )}
                            {displayTarget && (
                                <div className={`${layout.viewItemsPopup}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} style={{ top: displayTarget.top + 4, left: displayTarget.left + displayTarget.width / 2 }}>
                                    <button className={layout.viewItemsBtn} disabled={viewItemsTarget?.isEmpty} onClick={() => handleViewAssessmentsJump(viewItemsTarget)}>
                                        <Eye size={14} /> View assessments
                                    </button>
                                    {effectiveStatus === 'pending' && displayTarget.cognitiveLevel !== 'Points' && (
                                        <button className={layout.addCommentPopupBtn} onClick={() => handleStartCommentFromPopup(viewItemsTarget || displayTarget)}>
                                            <MessageSquare size={14} /> Add comment
                                        </button>
                                    )}
                                </div>
                            )}
                            {(showComment || isReturnedView) && effectiveStatus !== 'approved' && <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className={layout.commentPanelTitle}>{showResolvedPH ? 'Past Returns' : 'Comments'}</span>
                                        {!showResolvedPH && comments.filter(c => !c.resolved).length > 0 && (
                                            <span className={layout.commentPanelCount}>{comments.filter(c => !c.resolved).length}</span>
                                        )}
                                        {returnCount >= 2 && resolvedReturnNumbers.length > 0 && <button className={`${layout.commentResolvedToggleBtn} ${showResolvedPH ? layout.active : ''}`} onClick={() => { setShowResolvedPH(p => !p); if (!showResolvedPH) { setReturnFilter(defaultResolvedReturn); setAddingComment(false); setActiveScope(null); } }}>
                                            {showResolvedPH ? 'See active comments' : 'See past returns'}
                                        </button>}
                                    </div>
                                    {!isReturnedView && <button className={layout.commentPanelClose} onClick={closeCommentPanel} title="Close comments">&times;</button>}
                                </div>
                                <div ref={commentBodyRef} className={layout.commentPanelBody}>
                                    {scrolledPastForm && (
                                        <div className={layout.scrollToFormBtn} onClick={scrollToForm}>
                                            <ChevronUp size={22} strokeWidth={2.5} />
                                        </div>
                                    )}
                                    {addingComment && activeScope && !showResolvedPH ? (
                                        <div className={layout.commentFormCard}>
                                            <div className={layout.commentScope}>Commenting on {formatScopeText(activeScope)}</div>
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
                                                <div className={layout.selectionPrompt}>{phSection === 'Assessments' ? 'Select a file or point row to comment on...' : 'Select a cell to comment on...'}</div>
                                                <button className={layout.selectionCancel} onClick={handleCancelComment}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : isReturnedView || showResolvedPH ? null : (
                                        <button className={layout.addCommentBtn} onClick={() => setAddingComment(true)}>
                                            <Plus size={15} /> New Comment
                                        </button>
                                    )}
                                    {showResolvedPH ? (
                                        <>
                                            {returnCount > 0 && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <select className={layout.commentFilterDropdown} value={returnFilter} onChange={e => setReturnFilter(e.target.value)} style={{ width: '100%' }}>
                                                        <option value="all">All returns</option>
                                                        {Array.from({ length: Math.max(0, pastReturnMax) }, (_, i) => i + 1).filter(n => resolvedReturnNumbers.includes(n)).map(n => (
                                                            <option key={n} value={n}>Return {n}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className={layout.commentRoundDivider} />
                                            {returnFilter !== 'all' && returnDates[Number(returnFilter) - 1] && (
                                                <div className={layout.commentRoundBadge}>
                                                    Returned {new Date(returnDates[Number(returnFilter) - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                            {(() => {
                                                const filtered = comments.filter(c => c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax && (returnFilter === 'all' || c.scope.returnNumber === Number(returnFilter)));
                                                if (filtered.length === 0) return <div className={layout.commentEmptyState}>No comments from past returns</div>;
                                                if (returnFilter !== 'all') return filtered.map(c => (
                                                    <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ));
                                                const groups = {};
                                                filtered.forEach(c => { const r = c.scope.returnNumber || 0; if (!groups[r]) groups[r] = []; groups[r].push(c); });
                                                return Object.keys(groups).sort((a, b) => a - b).map(r => (
                                                    <div key={r} className={layout.commentRoundGroup}>
                                                        <div className={layout.commentRoundBadge}>
                                                            Return {r}{returnDates[r - 1] ? ` · ${new Date(returnDates[r - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                                        </div>
                                                        {groups[r].map(c => (
                                                            <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                                <div className={layout.commentCardHeader}>
                                                                    <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
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
                                        <div className={layout.commentEmptyState}>No comments yet</div>
                                    )}
                                    {comments.filter(c => !c.resolved).map(c => (
                                        <div key={c.id} className={`${layout.commentCard}${addingComment ? ` ${layout.commentCardDimmed}` : ''}`} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                            <div className={layout.commentCardHeader}>
                                                <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
                                                {!isReturnedView && <span className={layout.commentDeleteBtnWrap} title="Delete comment" onClick={e => { e.stopPropagation(); handleDeleteComment(c.id); }}><Trash2 size={15} /></span>}
                                            </div>
                                            {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                            <div className={layout.commentCardBody}>{c.body}</div>
                                            <div className={layout.commentCardTime}>{c.timestamp}</div>
                                        </div>
                                    ))}
                                        </>
                                    )}
                                </div>
                            </div>}
                        </div>
                        )
                    : isInstructorReturned ? (
                        <div className={layout.panelLayout}>
                            <div className={layout.panelMain}>
                                {selectedSection === 'Outcome Overview' &&
                                    <section>
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <div className={layout.totalPointsCard}>
                                            <div className={layout.totalPointsInfo}>
                                                <h3 className={layout.totalPointsTitle}>TOS Total Points</h3>
                                                <p className={layout.totalPointsSubtitle}>
                                                    Enter the total points of the exam. Points per CO and ILO are calculated automatically.
                                                </p>
                                                {tosTotalError && <div className={layout.totalPointsError}>{tosTotalError}</div>}
                                                {!allIlosComplete && (
                                                    <div className={layout.tosAllocationWarning}>
                                                        <AlertTriangle size={15} />
                                                        <span>Points are not fully allocated yet. Allocate assessment points so each ILO matches its target.</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={layout.totalPointsInputWrap}>
                                                <input
                                                    className={layout.totalPointsInput}
                                                    type="text"
                                                    inputMode="numeric"
                                                    readOnly={readOnly}
                                                    value={tosTotalPoints}
                                                    onChange={(e) => handleTotalPointsChange(e.target.value)}
                                                    placeholder="0"
                                                    aria-label="TOS Total Points"
                                                />
                                                <span className={layout.totalPointsUnit}>pts</span>
                                            </div>
                                        </div>
                                        <table className={`${layout.table} ${layout.TOSTable}`}>
                                            <thead>
                                            <tr>
                                                <th>ILOs</th>
                                                <th>DESCRIPTION</th>
                                                <th>NO. OF HOURS</th>
                                                <th>%</th>
                                                <th>POINTS</th>
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
                                                            <div className={`${layout.cellBox} ${layout.blankCell}`}>
                                                                    {co.totalPoints}
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {co.ilos.map((ilo) => (
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
                                                                {ilo.items}
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
                                    </div>
                                    </section>
                                }

                                {selectedSection === 'Assessments' && (
                                    <section>
                                        <AssessmentsStep examType={fromExamType}
                                            outcomeData={rows}
                                            questions={questions}
                                            setQuestions={setQuestions}
                                            assessmentMode={assessmentMode}
                                            errorFields={errorFields}
                                            clearFieldError={clearFieldError}
                                            courseCode={courseCode}
                                            assessmentName={assessmentName}
                                            onAssessmentNameChange={setAssessmentName}
                                            readOnly={readOnly}
                                            targetScope={navTargetScope}
                                            showComments
                                            onAttachmentsChange={setAttachments}
                                        />
                                    </section>
                                )}

                                {selectedSection === 'TOS Summary' &&
                                    <section>
                                        <TOSSummary outcomeData={rows} questions={questions} />
                                    </section>
                                }
                            </div>
                            {selectedSection === 'Assessments' && (
                            <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className={layout.commentPanelTitle}>{showResolvedPH ? 'Past Returns' : 'Comments'}</span>
                                        {!showResolvedPH && comments.filter(c => !c.resolved).length > 0 && (
                                            <span className={layout.commentPanelCount}>{comments.filter(c => !c.resolved).length}</span>
                                        )}
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
                                                <div style={{ marginBottom: 12 }}>
                                                    <select className={layout.commentFilterDropdown} value={returnFilter} onChange={e => setReturnFilter(e.target.value)} style={{ width: '100%' }}>
                                                        <option value="all">All returns</option>
                                                        {Array.from({ length: Math.max(0, pastReturnMax) }, (_, i) => i + 1).filter(n => resolvedReturnNumbers.includes(n)).map(n => (
                                                            <option key={n} value={n}>Return {n}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className={layout.commentRoundDivider} />
                                            {returnFilter !== 'all' && returnDates[Number(returnFilter) - 1] && (
                                                <div className={layout.commentRoundBadge}>
                                                    Returned {new Date(returnDates[Number(returnFilter) - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                            {(() => {
                                                const filtered = comments.filter(c => c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax && (returnFilter === 'all' || c.scope.returnNumber === Number(returnFilter)));
                                                if (filtered.length === 0) return <div className={layout.commentEmptyState}>No comments from past returns</div>;
                                                if (returnFilter !== 'all') return filtered.map(c => (
                                                    <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ));
                                                const groups = {};
                                                filtered.forEach(c => { const r = c.scope.returnNumber || 0; if (!groups[r]) groups[r] = []; groups[r].push(c); });
                                                return Object.keys(groups).sort((a, b) => a - b).map(r => (
                                                    <div key={r} className={layout.commentRoundGroup}>
                                                        <div className={layout.commentRoundBadge}>
                                                            Return {r}{returnDates[r - 1] ? ` · ${new Date(returnDates[r - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                                        </div>
                                                        {groups[r].map(c => (
                                                            <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                                <div className={layout.commentCardHeader}>
                                                                    <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
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
                                    {(() => {
                                        const unresolved = comments.filter(c => !c.resolved);
                                        return (
                                            <>
                                                {unresolved.length === 0 && (
                                                    <div className={layout.commentEmptyState}>
                                                        <CheckCircle size={28} color={resolvedCurrentReturn.length > 0 ? '#10B981' : '#9CA3AF'} strokeWidth={1.75} />
                                                        <span>{resolvedCurrentReturn.length > 0 ? 'All comments resolved' : 'No comments yet'}</span>
                                                    </div>
                                                )}
                                                {unresolved.map(c => (
                                                    <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
                                                            <span className={layout.commentResolveBtnWrap} title="Mark as resolved" onClick={(e) => { e.stopPropagation(); handleResolveComment(c.id); }}><CheckCircle size={15} /></span>
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
                                                    <div key={c.id} className={`${layout.commentCard} ${layout.commentCardResolved}`} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
                                                            <span className={layout.commentUndoBtnWrap} title="Unresolve comment" onClick={(e) => { e.stopPropagation(); handleUnresolveComment(c.id); }}><RotateCcw size={15} /></span>
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
                                        const totalPoints = rows.reduce((sum, co) => sum + (co.totalPoints || 0), 0);
                                        const totalCognitive = cognitiveLevels.map(level => {
                                            return rows.reduce((sum, co) => {
                                                return sum + co.ilos.reduce((iloSum, ilo) => {
                                                    const items = aggregatedData[co.co][ilo.id][level];
                                                    return iloSum + items.reduce((s, item) => s + (Number(item.points) || 0), 0);
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
                                                        <input type="text" disabled className={previewLayout.numberInput} value={fromExamType || assessmentName} />
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
                                                        <th rowSpan={2} className={previewLayout.headerCell}>Points</th>
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
                                                                  <td className={`${layout.cellClickable}${isTargetCell(co.co, '\u2014', 'Points') ? ` ${layout.cellTargeted}` : ''}`} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: '\u2014', cognitiveLevel: 'Points', top: r.bottom, left: r.left, width: r.width, isEmpty: !(co.totalPoints || 0) }); }}><div className={previewLayout.cellBox}>{co.totalPoints || 0}</div></td>
                                                                  {cognitiveLevels.map(level => (
                                                                     <td key={level} style={{ background: 'white' }}></td>
                                                                 ))}
                                                             </tr>
                                                              {co.ilos.map(ilo => (
                                                                  <tr key={ilo.id} data-tos-row={`${co.co}|${ilo.id}`}>
                                                                      <td><div className={previewLayout.cellBox}>{ilo.id}<InfoBadge text={ilo.description} /></div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.hours || 0}</div></td>
                                                                     <td><div className={previewLayout.cellBox}>{ilo.percentage || 0}</div></td>
                                                                        <td className={`${layout.cellClickable}${isTargetCell(co.co, ilo.id, 'Points') ? ` ${layout.cellTargeted}` : ''}`} onClick={e => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: 'Points', top: r.bottom, left: r.left, width: r.width, isEmpty: !(ilo.items || 0) }); }}><div className={previewLayout.cellBox}>{ilo.items || 0}</div></td>
                                                                     {cognitiveLevels.map(level => {
                                                                         const items = aggregatedData[co.co][ilo.id][level];
                                                                         return (
                                                                             <td key={level} className={`${addingComment ? `${layout.cellSelectableTable}${isActiveCell(co.co, ilo.id, level) ? ` ${layout.cellActiveTable}` : ''}` : `${layout.cellClickable}${isTargetCell(co.co, ilo.id, level) ? ` ${layout.cellTargeted}` : ''}`}`} onClick={e => addingComment ? handleCellClick(co.co, ilo.id, level, undefined, { courseOutcomeId: co.dbId }) : (() => { const r = e.currentTarget.getBoundingClientRect(); setViewItemsTarget({ co: co.co, ilo: ilo.id, cognitiveLevel: level, top: r.bottom, left: r.left, width: r.width, isEmpty: items.length === 0 }); })()}>                                                                                  <div className={previewLayout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
                                                                                      {(() => { const pts = items.reduce((s, item) => s + (Number(item.points) || 0), 0); return pts > 0 ? <span className={previewLayout.pointValue}>{pts}</span> : <span className={previewLayout.emptyDash}>{'\u2014'}</span>; })()}



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
                                                           <td><div className={previewLayout.cellBox}>{totalPoints}</div></td>
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
                                {selectedSection === 'Assessments' && (
                                    <section>
                                        <AssessmentOutput
                                            outcomeData={rows}
                                            questions={questions}
                                            courseCode={courseCode}
                                            period={fromExamType}
                                            targetScope={navTargetScope}
                                        />
                                    </section>
                                )}
                                {displayTarget && (
                                    <div className={`${layout.viewItemsOverlay}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} onClick={() => setViewItemsTarget(null)} />
                                )}
                                {displayTarget && (
                                    <div className={`${layout.viewItemsPopup}${!viewItemsTarget ? ` ${layout.viewItemsHidden}` : ''}`} style={{ top: displayTarget.top + 4, left: displayTarget.left + displayTarget.width / 2 }}>
                                        <button className={layout.viewItemsBtn} disabled={viewItemsTarget?.isEmpty} onClick={() => handleViewAssessmentsJump(viewItemsTarget)}>
                                            <Eye size={14} /> View assessments
                                        </button>
                                    </div>
                                )}
                            </div>
                            {isInstructorPendingWithComments && (
                            <div ref={commentRef} className={layout.commentPanel}>
                                <div className={layout.commentPanelHeader}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span className={layout.commentPanelTitle}>{showResolvedPH ? 'Past Returns' : 'Comments'}</span>
                                        {!showResolvedPH && comments.filter(c => !c.resolved).length > 0 && (
                                            <span className={layout.commentPanelCount}>{comments.filter(c => !c.resolved).length}</span>
                                        )}
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
                                                <div style={{ marginBottom: 12 }}>
                                                    <select className={layout.commentFilterDropdown} value={returnFilter} onChange={e => setReturnFilter(e.target.value)} style={{ width: '100%' }}>
                                                        <option value="all">All returns</option>
                                                        {Array.from({ length: Math.max(0, pastReturnMax) }, (_, i) => i + 1).filter(n => resolvedReturnNumbers.includes(n)).map(n => (
                                                            <option key={n} value={n}>Return {n}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                            <div className={layout.commentRoundDivider} />
                                            {returnFilter !== 'all' && returnDates[Number(returnFilter) - 1] && (
                                                <div className={layout.commentRoundBadge}>
                                                    Returned {new Date(returnDates[Number(returnFilter) - 1]).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            )}
                                            {(() => {
                                                const filtered = comments.filter(c => c.scope.returnNumber > 0 && c.scope.returnNumber <= pastReturnMax && (returnFilter === 'all' || c.scope.returnNumber === Number(returnFilter)));
                                                if (filtered.length === 0) return <div className={layout.commentEmptyState}>No comments from past returns</div>;
                                                if (returnFilter !== 'all') return filtered.map(c => (
                                                    <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                        <div className={layout.commentCardHeader}>
                                                            <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
                                                        </div>
                                                        {c.scope.itemNumber && c.type && <div className={layout.commentCardType}>{c.type}</div>}
                                                        <div className={layout.commentCardBody}>{c.body}</div>
                                                        <div className={layout.commentCardTime}>{c.timestamp}</div>
                                                    </div>
                                                ));
                                                const groups = {};
                                                filtered.forEach(c => { const r = c.scope.returnNumber || 0; if (!groups[r]) groups[r] = []; groups[r].push(c); });
                                                return Object.keys(groups).sort((a, b) => a - b).map(r => (
                                                    <div key={r} className={layout.commentRoundGroup}>
                                                        <div className={layout.commentRoundBadge}>
                                                            Return {r}{returnDates[r - 1] ? ` · ${new Date(returnDates[r - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                                                        </div>
                                                        {groups[r].map(c => (
                                                            <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                                <div className={layout.commentCardHeader}>
                                                                    <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
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
                                        {comments.filter(c => !c.resolved).length === 0 ? (
                                            <div className={layout.commentEmptyState}>No comments</div>
                                        ) : (
                                            comments.filter(c => !c.resolved).map(c => (
                                                <div key={c.id} className={layout.commentCard} onClick={() => handleCommentNavigation(c)} style={{ cursor: 'pointer' }}>
                                                    <div className={layout.commentCardHeader}>
                                                        <div className={layout.commentCardScope}>{formatScopeText(c.scope)}</div>
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
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                                        <div className={layout.totalPointsCard}>
                                            <div className={layout.totalPointsInfo}>
                                                <h3 className={layout.totalPointsTitle}>TOS Total Points</h3>
                                                <p className={layout.totalPointsSubtitle}>
                                                    Enter the total points of the exam. Points per CO and ILO are calculated automatically.
                                                </p>
                                                {tosTotalError && <div className={layout.totalPointsError}>{tosTotalError}</div>}
                                                {!allIlosComplete && (
                                                    <div className={layout.tosAllocationWarning}>
                                                        <AlertTriangle size={15} />
                                                        <span>Points are not fully allocated yet. Allocate assessment points so each ILO matches its target.</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className={layout.totalPointsInputWrap}>
                                                <input
                                                    className={layout.totalPointsInput}
                                                    type="text"
                                                    inputMode="numeric"
                                                    readOnly={readOnly}
                                                    value={tosTotalPoints}
                                                    onChange={(e) => handleTotalPointsChange(e.target.value)}
                                                    placeholder="0"
                                                    aria-label="TOS Total Points"
                                                />
                                                <span className={layout.totalPointsUnit}>pts</span>
                                            </div>
                                        </div>
                                        <table className={`${layout.table} ${layout.TOSTable}`}>
                                        <thead>
                                        <tr>
                                            <th>ILOs</th>
                                            <th>DESCRIPTION</th>
                                            <th>NO. OF HOURS</th>
                                            <th>%</th>
                                            <th>POINTS</th>
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
                                                        <div className={`${layout.cellBox} ${layout.blankCell}`}>
                                                                {co.totalPoints}
                                                        </div>
                                                    </td>
                                                </tr>

                                                {co.ilos.map((ilo) => (
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
                                                            {ilo.items}
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
                                    </div>
                                </section>
                            }

                            {selectedSection === 'Assessments' && (
                                <section>
                                    <AssessmentsStep examType={fromExamType}
                                        outcomeData={rows}
                                        questions={questions}
                                        setQuestions={setQuestions}
                                        assessmentMode={assessmentMode}
                                        errorFields={errorFields}
                                        clearFieldError={clearFieldError}
                                        courseCode={courseCode}
                                        assessmentName={assessmentName}
                                        onAssessmentNameChange={setAssessmentName}
                                        readOnly={readOnly}
                                        targetScope={navTargetScope}
                                        onAttachmentsChange={setAttachments}
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
                <div className={layout.modalOverlay} onClick={() => setShowExportErrorModal(false)}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3>Export Validation Errors</h3>
                            <button type="button" className={layout.closeIcon} onClick={() => setShowExportErrorModal(false)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <div className={layout.modalBody} style={{ textAlign: 'left' }}>
                            <p style={{ margin: '0 0 14px 0', color: '#4B5563', fontSize: '14px' }}>Please address the following requirements before exporting:</p>
                            {exportErrors.outcomeOverview.length > 0 && (
                                <div className={layout.errorBlock}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: 6 }}>Outcome Overview</div>
                                    {exportErrors.outcomeOverview.map((e, i) => <div key={i} style={{ fontSize: '12.5px', color: '#4B5563', padding: '2px 0' }}>• {e}</div>)}
                                </div>
                            )}
                            {exportErrors.assessmentMapping.length > 0 && (
                                <div className={layout.errorBlock}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: 6 }}>Assessment Alignment</div>
                                    {exportErrors.assessmentMapping.map((e, i) => <div key={i} style={{ fontSize: '12.5px', color: '#4B5563', padding: '2px 0' }}>• {e}</div>)}
                                </div>
                            )}
                            {exportErrors.tosSummary.length > 0 && (
                                <div className={layout.errorBlock}>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#111827', marginBottom: 6 }}>TOS Summary</div>
                                    {exportErrors.tosSummary.map((e, i) => <div key={i} style={{ fontSize: '12.5px', color: '#4B5563', padding: '2px 0' }}>• {e}</div>)}
                                </div>
                            )}
                        </div>
                        <div className={layout.modalActions}>
                            <button
                                className={layout.fixBtn}
                                onClick={() => setShowExportErrorModal(false)}
                            >
                                <Check size={15} /> Okay, I'll Fix It
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showApproveConfirm && (
                <div className={layout.modalOverlay} onClick={() => { setShowApproveConfirm(false); setApproveLoading(false); }}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3>Approve Table of Specifications</h3>
                            <button type="button" className={layout.closeIcon} onClick={() => { setShowApproveConfirm(false); setApproveLoading(false); }} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <div className={layout.modalBody}>
                            {openComments.length > 0 ? (
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ color: "#4B5563", margin: '0 0 14px 0', fontSize: '14px' }}>
                                        The following {openComments.length === 1 ? 'open comment' : `${openComments.length} open comments`} will be discarded upon approval. Proceed?
                                    </p>
                                    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                                        {openComments.map(c => (
                                            <div key={c.id} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#F9FAFB', textAlign: 'left' }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 3, wordBreak: 'break-word' }}>
                                                    {formatScopeText(c.scope)}
                                                </div>
                                                <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.4, wordBreak: 'break-word' }}>
                                                    {c.body}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p style={{ color: "#4B5563", fontSize: '14px', margin: 0 }}>Are you sure you want to approve this Table of Specifications?</p>
                            )}
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} onClick={() => { setShowApproveConfirm(false); setApproveLoading(false); }}>Cancel</button>
                            <button className={layout.confirmBtn} onClick={handleConfirmApprove}>
                                <CheckCircle size={15} /> {openComments.length > 0 ? 'Proceed to Approval' : 'Approve TOS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showApproveCountdown && (
                <div className={layout.modalOverlay} onClick={() => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); setShowApproveCountdown(false); setApproveLoading(false); }}>
                    <div className={previewLayout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={previewLayout.confirmTextRow}>
                            <CheckCircle size={20} color="#059669" />
                            <p className={previewLayout.confirmText}>{openComments.length > 0 ? 'Approving TOS (Comments Discarded)' : 'Approving TOS'}</p>
                        </div>
                        <div className={previewLayout.spinner} />
                        <span className={previewLayout.countdown}>{approveCountdown}s</span>
                        <button className={previewLayout.undoBtn} onClick={() => { if (approveTimerRef.current) clearTimeout(approveTimerRef.current); setShowApproveCountdown(false); setApproveLoading(false); }}>
                            <RotateCcw size={14} /> Undo
                        </button>
                    </div>
                </div>
            )}

            {showReturnConfirm && (
                <div className={layout.modalOverlay} onClick={() => { setShowReturnConfirm(false); setReturnLoading(false); }}>
                    <div className={layout.modal} onClick={e => e.stopPropagation()}>
                        <div className={layout.modalHeader}>
                            <h3>Return Table of Specifications</h3>
                            <button type="button" className={layout.closeIcon} onClick={() => { setShowReturnConfirm(false); setReturnLoading(false); }} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <div className={layout.modalBody}>
                            <p style={{ color: "#4B5563", fontSize: '14px', margin: 0 }}>Are you sure you want to return this Table of Specifications with review comments?</p>
                        </div>
                        <div className={layout.modalActions}>
                            <button className={layout.cancelBtn} onClick={() => { setShowReturnConfirm(false); setReturnLoading(false); }}>Cancel</button>
                            <button className={layout.returnConfirmBtn} onClick={handleConfirmReturn}>
                                <RotateCcw size={15} /> Confirm Return
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReturnCountdown && (
                <div className={layout.modalOverlay} onClick={() => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); setShowReturnCountdown(false); setReturnLoading(false); }}>
                    <div className={previewLayout.confirmPopup} onClick={e => e.stopPropagation()}>
                        <div className={previewLayout.confirmTextRow}>
                            <RotateCcw size={20} color="#DC2626" />
                            <p className={previewLayout.confirmText}>Returning TOS with Comments</p>
                        </div>
                        <div className={previewLayout.spinner} />
                        <span className={previewLayout.countdown}>{returnCountdown}s</span>
                        <button className={previewLayout.undoBtn} onClick={() => { if (returnTimerRef.current) clearTimeout(returnTimerRef.current); setShowReturnCountdown(false); setReturnLoading(false); }}>
                            <RotateCcw size={14} /> Undo
                        </button>
                    </div>
                </div>
            )}

            {showHistoryLog && (() => {
                const formatInstructorDisplay = (raw) => {
                    if (!raw || typeof raw !== 'string') return INSTRUCTOR.display;
                    const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
                    const toTitle = (str) => str.toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase());
                    if (parts.length === 2) return `${toTitle(parts[1])} ${toTitle(parts[0])}`;
                    return toTitle(raw);
                };
                const formatHistoryDate = (d) => {
                    if (!d) return '';
                    const dt = new Date(d);
                    if (Number.isNaN(dt.getTime())) return String(d);
                    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                };
                const addDaysIso = (base, deltaDays) => {
                    const dt = base ? new Date(base) : new Date('2026-10-09T00:00:00.000Z');
                    const valid = Number.isNaN(dt.getTime()) ? new Date('2026-10-09T00:00:00.000Z') : new Date(dt.getTime());
                    valid.setDate(valid.getDate() + deltaDays);
                    return valid.toISOString();
                };

                const instructorName = formatInstructorDisplay(courseInstructor);
                const phName = PROGRAM_HEAD.display;
                const resolvedList = comments.filter(c => c.resolved);
                const maxCommentRound = resolvedList.reduce((m, c) => Math.max(m, Number(c.scope?.returnNumber) || 1), 0);
                const rounds = Math.max(returnCount || 0, maxCommentRound);

                let versions = [];
                if (rounds > 0) {
                    const firstRet = returnDates[0] || statusTimestamps.returnedAt || '2026-10-15T00:00:00.000Z';
                    const firstSub = addDaysIso(firstRet, -5);
                    const assignedDt = addDaysIso(firstSub, -7);
                    const round1Comments = resolvedList.filter(c => (Number(c.scope?.returnNumber) || 1) === 1);

                    versions.push({
                        version: 1,
                        actions: [
                            {
                                type: 'assigned',
                                badge: 'ASSIGNED',
                                name: phName,
                                role: 'Program Head',
                                desc: 'Assigned the course Table of Specifications for preparation and composition.',
                                date: formatHistoryDate(assignedDt)
                            },
                            {
                                type: 'submitted',
                                badge: 'SUBMITTED',
                                name: instructorName,
                                role: 'Instructor',
                                desc: 'Submitted the course Table of Specifications for review and evaluation.',
                                date: formatHistoryDate(firstSub)
                            },
                            {
                                type: 'returned',
                                badge: 'RETURNED FOR REVISION',
                                name: phName,
                                role: 'Program Head',
                                desc: 'Returned the course Table of Specifications with review comments requiring revision.',
                                date: formatHistoryDate(firstRet),
                                comments: round1Comments
                            }
                        ]
                    });

                    for (let r = 2; r <= rounds; r++) {
                        const retDt = returnDates[r - 1] || statusTimestamps.returnedAt || addDaysIso(firstRet, (r - 1) * 7);
                        const resubDt = addDaysIso(retDt, -3);
                        const roundComments = resolvedList.filter(c => (Number(c.scope?.returnNumber) || 1) === r);
                        versions.push({
                            version: r,
                            actions: [
                                {
                                    type: 'resubmitted',
                                    badge: 'RESUBMITTED',
                                    name: instructorName,
                                    role: 'Instructor',
                                    desc: 'Resubmitted the revised Table of Specifications for review and evaluation.',
                                    date: formatHistoryDate(resubDt)
                                },
                                {
                                    type: 'returned',
                                    badge: 'RETURNED FOR REVISION',
                                    name: phName,
                                    role: 'Program Head',
                                    desc: 'Returned the course Table of Specifications with review comments requiring revision.',
                                    date: formatHistoryDate(retDt),
                                    comments: roundComments
                                }
                            ]
                        });
                    }

                    const lastRetDt = returnDates[rounds - 1] || statusTimestamps.returnedAt || firstRet;
                    const finalSubDt = (statusTimestamps.submittedAt && new Date(statusTimestamps.submittedAt) > new Date(lastRetDt))
                        ? statusTimestamps.submittedAt
                        : addDaysIso(lastRetDt, 3);
                    const finalAppDt = statusTimestamps.approvedAt || addDaysIso(finalSubDt, 2);

                    versions.push({
                        version: rounds + 1,
                        actions: [
                            {
                                type: 'resubmitted',
                                badge: 'RESUBMITTED',
                                name: instructorName,
                                role: 'Instructor',
                                desc: 'Resubmitted the revised Table of Specifications for review and evaluation.',
                                date: formatHistoryDate(finalSubDt)
                            },
                            {
                                type: 'approved',
                                badge: 'APPROVED',
                                name: phName,
                                role: 'Program Head',
                                desc: 'Approved the course Table of Specifications.',
                                date: formatHistoryDate(finalAppDt)
                            }
                        ]
                    });
                } else if (courseCode === 'BSCS314L' && historyData['BSCS314L']) {
                    const seedV1 = historyData['BSCS314L'].versions[0];
                    const seedV2 = historyData['BSCS314L'].versions[1];
                    const retAction = seedV1?.actions?.find(a => a.action?.includes('returned'));
                    versions = [
                        {
                            version: 1,
                            actions: [
                                {
                                    type: 'assigned',
                                    badge: 'ASSIGNED',
                                    name: phName,
                                    role: 'Program Head',
                                    desc: 'Assigned the course Table of Specifications for preparation and composition.',
                                    date: formatHistoryDate('2026-06-03')
                                },
                                {
                                    type: 'submitted',
                                    badge: 'SUBMITTED',
                                    name: instructorName,
                                    role: 'Instructor',
                                    desc: 'Submitted the course Table of Specifications for review and evaluation.',
                                    date: formatHistoryDate(seedV1?.actions?.[0]?.date || '2026-06-10')
                                },
                                {
                                    type: 'returned',
                                    badge: 'RETURNED FOR REVISION',
                                    name: phName,
                                    role: 'Program Head',
                                    desc: 'Returned the course Table of Specifications with review comments requiring revision.',
                                    date: formatHistoryDate(retAction?.date || '2026-06-15'),
                                    comments: retAction?.comments || []
                                }
                            ]
                        },
                        {
                            version: 2,
                            actions: [
                                {
                                    type: 'resubmitted',
                                    badge: 'RESUBMITTED',
                                    name: instructorName,
                                    role: 'Instructor',
                                    desc: 'Resubmitted the revised Table of Specifications for review and evaluation.',
                                    date: formatHistoryDate(seedV2?.actions?.[0]?.date || '2026-06-18')
                                },
                                {
                                    type: 'approved',
                                    badge: 'APPROVED',
                                    name: phName,
                                    role: 'Program Head',
                                    desc: 'Approved the course Table of Specifications.',
                                    date: formatHistoryDate(seedV2?.actions?.[1]?.date || '2026-06-20')
                                }
                            ]
                        }
                    ];
                } else {
                    const subDt = statusTimestamps.submittedAt || (courseCode === 'BSCS223L' ? '2026-06-12' : '2026-10-09');
                    const assDt = addDaysIso(subDt, -7);
                    const appDt = statusTimestamps.approvedAt || (courseCode === 'BSCS223L' ? '2026-06-16' : '2026-10-16');
                    versions = [
                        {
                            version: 1,
                            actions: [
                                {
                                    type: 'assigned',
                                    badge: 'ASSIGNED',
                                    name: phName,
                                    role: 'Program Head',
                                    desc: 'Assigned the course Table of Specifications for preparation and composition.',
                                    date: formatHistoryDate(assDt)
                                },
                                {
                                    type: 'submitted',
                                    badge: 'SUBMITTED',
                                    name: instructorName,
                                    role: 'Instructor',
                                    desc: 'Submitted the course Table of Specifications for review and evaluation.',
                                    date: formatHistoryDate(subDt)
                                },
                                {
                                    type: 'approved',
                                    badge: 'APPROVED',
                                    name: phName,
                                    role: 'Program Head',
                                    desc: 'Approved the course Table of Specifications.',
                                    date: formatHistoryDate(appDt)
                                }
                            ]
                        }
                    ];
                }

                const orderedVersions = [...versions].reverse();
                return (
                    <div className={layout.hlOverlay} onClick={() => setShowHistoryLog(false)}>
                        <div className={layout.hlModal} role="dialog" aria-modal="true" aria-labelledby="historyLogTitle" tabIndex={-1} ref={historyModalRef} onClick={e => e.stopPropagation()}>
                            <div className={layout.hlHeader}>
                                <h3 id="historyLogTitle" className={layout.hlTitle}>History Log</h3>
                                <span className={layout.hlClose} onClick={() => setShowHistoryLog(false)}>×</span>
                            </div>
                            <div className={layout.hlBody}>
                                <div className={layout.hlLeft}>
                                    <div className={layout.hlLeftHeader}>
                                        <select className={layout.historyPageSelect} value={historyPage} onChange={e => setHistoryPage(e.target.value)}>
                                            <option value="tosReport">Table of Specifications Report</option>
                                            <option value="assessmentItems">Assessments</option>
                                        </select>
                                    </div>
                                    <div className={layout.hlLeftContent}>
                                    {historyPage === 'tosReport' ? (() => {
                                        const totalHours = rows.reduce((s, r) => s + (r.totalHours || 0), 0);
                                        const totalPercentage = Math.min(rows.reduce((s, r) => s + (r.totalPercentage || 0), 0), 100);
                                        const totalPoints = rows.reduce((s, r) => s + (r.totalPoints || 0), 0);
                                        const totalCognitive = cognitiveLevels.map(level =>
                                            rows.reduce((sum, r) => sum + r.ilos.reduce((s, ilo) => {
                                                const items = (questions || []).filter(q => q.co === r.co && q.ilo === ilo.id && q.cognitiveLevel === level);
                                                return s + items.reduce((p, it) => p + (Number(it.points) || 0), 0);
                                            }, 0), 0)
                                        );
                                        return (
                                        <div className={layout.hlReport}>
                                            <div className={layout.hlMeta}>
                                                <div className={layout.hlMetaItem}>
                                                    <span className={layout.hlMetaLabel}>Course:</span>
                                                    <span className={layout.hlMetaValue}>{courseCode && courseName ? `${courseCode} - ${courseName}` : (courseCode || courseName)}</span>
                                                </div>
                                                <div className={layout.hlMetaItem}>
                                                    <span className={layout.hlMetaLabel}>Type:</span>
                                                    <span className={layout.hlMetaValue}>{fromExamType || assessmentName}</span>
                                                </div>
                                                <div className={layout.hlMetaItem}>
                                                    <span className={layout.hlMetaLabel}>Semester:</span>
                                                    <span className={layout.hlMetaValue}>{fromSemester}</span>
                                                </div>
                                                <div className={layout.hlMetaItem}>
                                                    <span className={layout.hlMetaLabel}>School Year:</span>
                                                    <span className={layout.hlMetaValue}>{`${fromSchoolYear} - ${Number(fromSchoolYear) + 1}`}</span>
                                                </div>
                                            </div>
                                            <div className={layout.hlTableWrap}>
                                            <table className={layout.hlTable}>
                                                <thead>
                                                    <tr>
                                                        <th className={layout.hlTh}>COs & ILOs</th>
                                                        <th className={`${layout.hlTh} ${layout.hlThNum}`}>No. of Hours</th>
                                                        <th className={`${layout.hlTh} ${layout.hlThNum}`}>%</th>
                                                        <th className={`${layout.hlTh} ${layout.hlThNum}`}>Points</th>
                                                        <th colSpan={6} className={`${layout.hlTh} ${layout.hlThGroup}`}>Cognitive Levels</th>
                                                    </tr>
                                                    <tr>
                                                        <th className={layout.hlTh}></th>
                                                        <th className={layout.hlTh}></th>
                                                        <th className={layout.hlTh}></th>
                                                        <th className={layout.hlTh}></th>
                                                        {cognitiveLevels.map(level => (
                                                            <th key={level} className={`${layout.hlTh} ${layout.hlThNum}`}>{level}</th>
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
                                                            <tr data-tos-row={co.co} className={layout.hlCoRow}>
                                                                <td className={layout.hlTdLabel}><span className={layout.hlCoName}>{co.co}<InfoBadge text={co.description} /></span></td>
                                                                <td className={layout.hlTdNum}>{co.totalHours || 0}</td>
                                                                <td className={layout.hlTdNum}>{co.totalPercentage || 0}</td>
                                                                <td className={layout.hlTdNum}>{co.totalPoints || 0}</td>
                                                                {cognitiveLevels.map(level => (
                                                                    <td key={level} className={layout.hlTdNum}></td>
                                                                ))}
                                                            </tr>
                                                            {co.ilos.map(ilo => {
                                                                return (
                                                                <tr data-tos-row={`${co.co}-${ilo.id}`} key={`${co.co}-${ilo.id}`} className={layout.hlIloRow}>
                                                                    <td className={layout.hlTdLabel}><span className={layout.hlIloName}>{ilo.id}<InfoBadge text={ilo.description} /></span></td>
                                                                    <td className={layout.hlTdNum}>{ilo.hours || 0}</td>
                                                                    <td className={layout.hlTdNum}>{ilo.percentage || 0}</td>
                                                                    <td className={layout.hlTdNum}>{ilo.items || 0}</td>
                                                                    {cognitiveLevels.map(level => {
                                                                        const items = (agg?.items?.[ilo.id]?.[level] || []);
                                                                        return (
                                                                            <td key={level} className={items.length === 0 ? `${layout.hlTdNum} ${layout.hlTdEmpty}` : `${layout.hlTdNum} ${layout.hlTdFilled}`}>
                                                                                {(() => { const pts = items.reduce((p, it) => p + (Number(it.points) || 0), 0); return pts > 0 ? pts : '\u2014'; })()}
                                                                            </td>
                                                                        );
                                                                    })}
                                                                </tr>
                                                            )})}
                                                        </React.Fragment>
                                                    )})}
                                                    <tr data-tos-row="Total" className={layout.hlTotalRow}>
                                                        <td className={layout.hlTdLabel}>Total</td>
                                                        <td className={layout.hlTdNum}>{totalHours}</td>
                                                        <td className={layout.hlTdNum}>{totalPercentage}</td>
                                                        <td className={layout.hlTdNum}>{totalPoints}</td>
                                                        {totalCognitive.map((total, index) => (
                                                            <td key={index} className={layout.hlTdNum}>{total}</td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                            </div>
                                        </div>
                                        );
                                    })()
                                    : (
                                        <AssessmentOutput
                                            outcomeData={rows}
                                            questions={questions}
                                            courseCode={courseCode}
                                            period={fromExamType}
                                        />
                                    )}
                                    </div>
                                </div>
                                <div className={layout.hlRight}>
                                    <div className={layout.hlVersionList}>
                                        {orderedVersions.map(v => {
                                            const isCollapsed = !!collapsedVersions[v.version];
                                            return (
                                                <div key={v.version} className={layout.hlVersionBox}>
                                                    <button
                                                        type="button"
                                                        className={`${layout.hlVersionHeader}${isCollapsed ? ` ${layout.hlVersionHeaderCollapsed}` : ''}`}
                                                        onClick={() => setCollapsedVersions(prev => ({ ...prev, [v.version]: !prev[v.version] }))}
                                                        aria-expanded={!isCollapsed}
                                                    >
                                                        <span>Version {v.version}</span>
                                                        <span className={layout.hlVersionCaret}>{isCollapsed ? '▼' : '▲'}</span>
                                                    </button>
                                                    {!isCollapsed && (
                                                        <div className={layout.hlVersionBody}>
                                                            <div className={layout.hlTimeline}>
                                                                {v.actions.map((a, i) => {
                                                                    const dotMod = a.type === 'approved' ? layout.hlDotApproved
                                                                        : a.type === 'returned' ? layout.hlDotReturned
                                                                        : a.type === 'assigned' ? layout.hlDotAssigned
                                                                        : layout.hlDotSubmitted;
                                                                    const badgeMod = a.type === 'approved' ? layout.hlBadgeApproved
                                                                        : a.type === 'returned' ? layout.hlBadgeReturned
                                                                        : a.type === 'assigned' ? layout.hlBadgeAssigned
                                                                        : layout.hlBadgeSubmitted;
                                                                    return (
                                                                        <div key={i} className={layout.hlEvent}>
                                                                            <div className={`${layout.hlDot} ${dotMod}`} />
                                                                            <div className={layout.hlEventCol}>
                                                                                <div className={layout.hlEventCard}>
                                                                                    <div className={layout.hlEventHeader}>
                                                                                        <div style={{ minWidth: 0 }}>
                                                                                            <div className={layout.hlEventName}>{a.name}</div>
                                                                                            <div className={layout.hlEventRole}>{a.role}</div>
                                                                                        </div>
                                                                                        <span className={`${layout.hlStatusBadge} ${badgeMod}`}>{a.badge}</span>
                                                                                    </div>
                                                                                    <div className={layout.hlEventDesc}>{a.desc}</div>
                                                                                    {a.date && <div className={layout.hlEventDate}>{a.date}</div>}
                                                                                </div>
                                                                                {a.comments && a.comments.length > 0 && (
                                                                                    <div className={layout.hlCommentsBranch}>
                                                                                        {a.comments.map((c, ci) => (
                                                                                            <div key={ci} className={layout.hlCommentCard}>
                                                                                                <div className={layout.hlCommentTop}>
                                                                                                    <div className={layout.hlCommentScope}>{formatScopeText(c.scope)}</div>
                                                                                                </div>
                                                                                                <blockquote className={layout.hlCommentQuote}>&ldquo;{c.body}&rdquo;</blockquote>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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


