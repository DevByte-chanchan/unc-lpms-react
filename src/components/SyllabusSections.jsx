
import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, MessageCircle, X, ExternalLink, Book} from 'react-feather';
import { Info } from 'react-feather';
import React, {useEffect, useState} from "react";
import TextField from "./TextField.jsx";
import TextArea from "./TextArea.jsx";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import {getSyllabusByCode} from "../data/syllabiData.js";
import {getWorkflow, setWorkflow} from "../utils/workflowHelpers.js";
import { getReferences, getReferenceById } from '../utils/referenceLibrary';
import TOSPreview from "../pages/TosPreview.jsx";
import LibraryDirectorSuggestions from "./LibraryDirectorSuggestions.jsx";
import { getSuggestions, acceptSuggestion, rejectSuggestion } from '../utils/dataStore.js'
import SyllabusPreview from "./SyllabusPreview.jsx";



const SyllabusSections = ({status}) => {

    // MUST: Get route params first before any hooks that use code
    const { code } = useParams();
    const navigate = useNavigate();

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';

    // Workflow state (lazy-init from localStorage to avoid flash)
    const [workflow, setWorkflowState] = useState(() => code ? getWorkflow(code) : null);

    // NEW: Loading State
    const [isLoading, setIsLoading] = useState(false);

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const handleSaveDraft = () => {
        const existing = getWorkflow(code)
        const stage = existing?.currentStage
        if (!stage || stage === 'submitted') {
            const wf = existing
                ? { ...existing, currentStage: 'submitted' }
                : {
                    courseCode: code,
                    currentStage: 'submitted',
                    parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
                    programHead: { status: 'pending', completedAt: null },
                    dean: { status: 'pending', completedAt: null }
                  }
            setWorkflow(code, wf)
            setWorkflowState(getWorkflow(code))
            showToast('Saved as draft!')
        } else {
            setWorkflow(code, existing)
            setWorkflowState(getWorkflow(code))
            showToast('Progress saved!')
        }
    }

    const handleSubmitConfirm = () => {
        const existing = getWorkflow(code)
        const stage = existing?.currentStage

        if (stage && stage !== 'submitted' && stage !== 'returned') {
            showToast('Cannot submit at this stage.', 'warning')
            return
        }

        const wf = existing
            ? {
                ...existing,
                currentStage: 'parallel_review',
                submittedAt: existing.submittedAt || new Date().toISOString(),
                parallelReview: {
                    library_director: { status: 'pending', completedAt: null },
                    industry_consultant: { status: 'pending', completedAt: null }
                },
                programHead: existing.programHead?.status === 'done' ? existing.programHead : { status: 'pending', completedAt: null },
                dean: existing.dean?.status === 'done' ? existing.dean : { status: 'pending', completedAt: null }
              }
            : {
                courseCode: code,
                currentStage: 'parallel_review',
                submittedAt: new Date().toISOString(),
                parallelReview: { library_director: { status: 'pending', completedAt: null }, industry_consultant: { status: 'pending', completedAt: null } },
                programHead: { status: 'pending', completedAt: null },
                dean: { status: 'pending', completedAt: null }
              }
        setWorkflow(code, wf)
        setWorkflowState(getWorkflow(code))
        setIsPreviewOpen(false)
        showToast('Syllabus submitted for review!')
        setTimeout(() => navigate('/'), 800)
    }

    // Reference search and filter state
    const [refSearchTerm, setRefSearchTerm] = useState('');
    const [refFilterType, setRefFilterType] = useState('');
    const [refDeleteKey, setRefDeleteKey] = useState(0);

    // Suggestion state
    const [suggestions, setSuggestions] = useState([]);
    const [suggestionRefreshKey, setSuggestionRefreshKey] = useState(0);

    // Get syllabus data
    const syllabus = getSyllabusByCode(code);

    // Filtered references
    const filteredReferences = React.useMemo(() => {
        const refs = syllabus?.references || [];
        let result = refs;
        if (refFilterType) {
            result = result.filter(r => r.type === refFilterType);
        }
        if (refSearchTerm) {
            const term = refSearchTerm.toLowerCase();
            result = result.filter(r =>
                (r.title || '').toLowerCase().includes(term) ||
                (r.authors || '').toLowerCase().includes(term) ||
                (r.id || '').toLowerCase().includes(term)
            );
        }
        return result;
    }, [syllabus, refSearchTerm, refFilterType, refDeleteKey]);

    // Reference library enrichment + actions
    const [viewRef, setViewRef] = useState(null);
    const [deleteConfirmRef, setDeleteConfirmRef] = useState(null);
    const CURRENT_YEAR = new Date().getFullYear();
    const isDeprecated = (ref) => {
        if (!ref.year) return false;
        const y = typeof ref.year === 'string' ? parseInt(ref.year) : ref.year;
        return !isNaN(y) && CURRENT_YEAR - y >= 5;
    };
    const hasIssues = (ref) => ref.hasIssue === true;

    // COURSE AND PROGRAM OUTCOME ALIGNMENT
    const courseOutcomes = (syllabus && syllabus.courseOutcomes) || [];

    const programOutcomes = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'];

    const CriteriaForm = React.lazy(() => import('../pages/CriteriaForGradingForm.jsx'));

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value })
    }

    const handleAcceptSuggestion = (id) => {
        acceptSuggestion(id);
        setSuggestionRefreshKey(k => k + 1);
        setRefDeleteKey(k => k + 1);
    };

    const handleRejectSuggestion = (id) => {
        rejectSuggestion(id);
        setSuggestionRefreshKey(k => k + 1);
    };

    // NEW: Effect to trigger loading whenever selectedSection changes
    useEffect(() => {
        setIsLoading(true);
        // Simulate a network request or rendering delay
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500); // 0.5 seconds delay

        return () => clearTimeout(timer);
    }, [selectedSection]);

    // Load workflow status
    useEffect(() => {
        if (code) {
            const wf = getWorkflow(code);
            setWorkflowState(wf);
        }
    }, [code]);

    // Load suggestions from approval flow
    useEffect(() => {
        if (code) {
            setSuggestions(getSuggestions(code))
        }
    }, [code, suggestionRefreshKey]);

    // Debug logging
    useEffect(() => {
        console.log('SyllabusSections - Code:', code);
        console.log('SyllabusSections - Syllabus:', syllabus);
    }, [code, syllabus]);

    const getTopicByTlaName = (tlaName) => {
        if (!syllabus || !syllabus.topics) return "—";
        for (const topic of syllabus.topics) {
            const found = topic.tlas.find(tla => tla.tlaName === tlaName);
            if (found) return topic.title;
        }
        return "—";
    };

    const getCoIloByTlaName = (tlaName) => {
        if (!syllabus || !syllabus.topics || !syllabus.ilos) return "—";
        const topic = syllabus.topics
            .find(t => t.tlas.some(tla => tla.tlaName === tlaName));

        if (!topic) return "—";

        const ilo = syllabus.ilos
            .find(i => i.topics.includes(topic.title));

        return ilo?.id || "—";
    };

    // If no course code or syllabus not found, show loading/error state
    if (!code || !syllabus) {
        return (
            <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                    <p style={{ fontSize: '18px', marginBottom: '10px' }}>Loading course syllabus...</p>
                    <p style={{ fontSize: '14px' }}>If this page doesn't load, please go back and try again.</p>
                </div>
            </div>
        );
    }

    return(
        <div className={styles.container}>
            <div className={styles.navi}>
                <Link  to={`/`} className={'actionLink'} >
                    <div className={styles.return}>
                        <ChevronLeft size={22}/>
                    </div>
                </Link>


                <div className={styles['section-select']}>
                    <select value={selectedSection} onChange={handleSectionChange}>
                        <option value="Course Details">Course Details</option>
                        <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                        <option value="References">References</option>
                        <option value="Topics">Topics & Teaching and Learning Activities</option>
                        <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                        <option value="Assessments">Assessments</option>
                        <option value="Criteria for Grading">Criteria for Grading</option>
                    </select>
                </div>

                <div onClick={handleSaveDraft} className={styles.draft}>{workflow?.currentStage && workflow?.currentStage !== 'submitted' ? 'Save' : 'Save as Draft'}</div>

                <div onClick={() => setIsPreviewOpen(true)} className={styles.submit}>{workflow?.currentStage === 'returned' ? 'Submit Revision' : 'Submit'}</div>
            </div>

            <div className={styles['dynamic-sections']}>

                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : (
                    <>

                        {selectedSection === 'Course Details' &&
                            <section>
                                <div className={styles.form}>
                                    <div className={styles['double-field']}>
                                        <div className={styles.colA}>
                                            <TextField
                                                initialValue={syllabus?.name || ''}
                                                disabled={true}
                                                label="Course Title"
                                            />
                                            <TextField
                                                initialValue={syllabus?.code || ''}
                                                disabled={true}
                                                label="Course Number"
                                            />
                                            <TextField
                                                initialValue={syllabus?.contact || ''}
                                                disabled={true}
                                                label="Contact Hours"
                                            />
                                            <TextField
                                                initialValue={syllabus?.prerequisites || ''}
                                                disabled={true}
                                                label="Prerequisites"
                                            />
                                            <TextField
                                                initialValue={syllabus?.year || ''}
                                                disabled={true}
                                                label="Year Level"
                                            />

                                        </div>
                                        <div className={styles.colB}>
                                            <TextField
                                                initialValue={syllabus?.revision || '0'}
                                                disabled={true}
                                                label="Syllabus Revision No"
                                            />
                                            <TextField
                                                initialValue={syllabus?.credits || ''}
                                                disabled={true}
                                                label="Credit"
                                            />
                                            <TextField
                                                initialValue={syllabus?.class || ''}
                                                disabled={true}
                                                label="Classification/Field"
                                            />
                                            <TextField
                                                initialValue={syllabus?.cmo || ''}
                                                disabled={true}
                                                label="CMO"
                                            />
                                            <TextField
                                                initialValue={syllabus?.sem || ''}
                                                disabled={true}
                                                label="Term"
                                            />
                                        </div>
                                    </div>

                                    <TextArea
                                        initialValue={syllabus?.description || ''}
                                        disabled={false}
                                        label="Course Description"
                                        rows={10}
                                    />
                                    <br/><br/><br/>
                                </div>

                            </section>
                        }

                        {selectedSection === 'Course and Program Outcome Alignment' &&

                            <section>
                                <div className={styles['cpa-container']}>

                                    <div className={styles.legend}>
                                        <p>Legend</p>
                                        <div className={styles.legends}>
                                            <p><strong>I</strong> - An Introductory Course</p>
                                            <p><strong>E</strong> - An Introductory Course</p>
                                            <p><strong>D</strong> - An Introductory Course</p>
                                        </div>
                                    </div>

                                    <table>
                                        <thead>
                                        <tr>
                                            <th className={styles['course-descrip']}>After completing the course, the student should be  able to:</th>
                                            <th width={82}>PO1 </th>
                                            <th width={82}>PO2 </th>
                                            <th width={82}>PO3 </th>
                                            <th width={82}>PO4 </th>
                                            <th width={82}>PO5 </th>
                                            <th width={82}>PO6 </th>
                                            <th width={82}>PO7 </th>
                                            <th width={82}>PO8 </th>
                                            <th width={82}>PO9 </th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {/* Loop over each item in the courseOutcomes array */}
                                        {courseOutcomes.map((co, coIndex) => (
                                            <tr key={co.id}>

                                                {/* Column 1: Course Outcome ID */}
                                                <td className={styles.courseNo}>
                                                    {co.id}
                                                </td>

                                                {/* Column 2: Description */}
                                                <td className={styles.courseDescripInput}>
                                                    <TextArea initialValue={co.description} rows={8} />
                                                </td>

                                                {/* Columns 3 onwards: The 9 dropdown options */}
                                                {[...Array(9)].map((_, poIndex) => (
                                                    <td className={styles.dropdownOptions} key={poIndex}>
                                                        {/* We use defaultValue set to the specific mapping index.
                   If the data is undefined, it falls back to " "
                */}
                                                        <select defaultValue={co.poMappings[poIndex] || " "}>
                                                            <option value=" "></option>
                                                            <option value="I">I</option>
                                                            <option value="E">E</option>
                                                            <option value="D">D</option>
                                                        </select>
                                                    </td>
                                                ))}

                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>

                                </div>
                            </section>

                        }

                        {selectedSection === 'References' &&
                            <section>
                                <div className={styles['references-container']}>
                                    <LibraryDirectorSuggestions 
                                        courseCode={code} 
                                        onAddReferences={(selectedRefs) => {
                                            if (!syllabus.references) syllabus.references = [];
                                            selectedRefs.forEach(ref => {
                                                if (!syllabus.references.find(r => r.id === ref.id)) {
                                                    syllabus.references.push(ref);
                                                }
                                            });
                                        }}
                                    />

                                    {suggestions.filter(s => s.status === 'pending').length > 0 && (
                                        <div style={{ marginTop: 16, marginBottom: 16, padding: '16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                                            <h4 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 600, color: '#92400e' }}>
                                                Pending Suggestions from Approval Review
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {suggestions.filter(s => s.status === 'pending').map(s => (
                                                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'white', borderRadius: 6, border: '1px solid #fde68a' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937' }}>{s.reference.title}</div>
                                                            <div style={{ fontSize: 13, color: '#6b7280' }}>{s.reference.authors} &middot; {s.reference.year || 'N/A'} &middot; Suggested by {s.suggestedBy} on {new Date(s.suggestedAt).toLocaleDateString()}</div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                                                            <button onClick={() => handleAcceptSuggestion(s.id)} style={{ padding: '6px 14px', background: '#047857', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Accept</button>
                                                            <button onClick={() => handleRejectSuggestion(s.id)} style={{ padding: '6px 14px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Reject</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles['references-header']}>
                                        <div className={'search-container'} style={{ flex: 1, maxWidth: 'none' }}>
                                            <div className={'search-bar'} style={{ maxWidth: 'none', width: '100%' }}>
                                                <Search size={18}/>
                                                <input placeholder={"Search reference name"} type="text" value={refSearchTerm} onChange={(e) => setRefSearchTerm(e.target.value)}/>
                                            </div>
                                        </div>

                                        <div className={'filter-container'}>
                                            <p>Filter by <strong>Reference Type</strong>:</p>
                                            <select value={refFilterType} onChange={(e) => setRefFilterType(e.target.value)}>
                                                <option value="">All Types</option>
                                                <option value="Textbook">Textbook</option>
                                                <option value="Open Educational Resources">Open Educational Resources</option>
                                                <option value="Online Resources">Online Resources</option>
                                            </select>
                                        </div>

                                        <Link to={'/references/form/:id'}>
                                            <div className={'add-button'}>
                                                <Plus size={16} strokeWidth={3}/> Add Reference
                                            </div>
                                        </Link>
                                    </div>

                                    <div style={{ overflow: 'auto', width: '100%' }}>
                                    <table style={{ borderCollapse: 'collapse', width: 'max-content', minWidth: '100%' }}>
                                        <thead>
                                        <tr>
                                            <th style={{ width: 80, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000' }}>ID</th>
                                            <th style={{ width: 340, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000' }}>TITLE</th>
                                            <th style={{ width: 180, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000' }}>AUTHOR(S)</th>
                                            <th style={{ width: 200, padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000' }}>TYPE</th>
                                            <th style={{ width: 80, padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000' }}>YEAR</th>
                                            <th style={{ width: 150, padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000' }}>STATUS</th>
                                            <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#000', whiteSpace: 'nowrap', flex: 1 }}>ACTIONS</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {filteredReferences && filteredReferences.length > 0 ? (
                                            filteredReferences.map((ref) => {
                                                const refType = ref.type || '';
                                                const prefix = refType === 'Textbook' ? 'TB' : refType === 'Online Resources' ? 'OR' : refType === 'Open Educational Resources' ? 'OE' : 'RF';
                                                const refId = ref.id || `${prefix}${filteredReferences.indexOf(ref) + 1}`;
                                                const tc = { bg: refType === 'Textbook' ? '#dcfce7' : refType === 'Open Educational Resources' ? '#e0f2fe' : '#f3e8ff', color: refType === 'Textbook' ? '#047857' : refType === 'Open Educational Resources' ? '#0284c7' : '#7c3aed' };
                                                let statusLabel = 'Active';
                                                let statusStyle = { bg: '#ecfdf5', color: '#047857' };
                                                const libRef = getReferences().find(r => r.id === ref.id);
                                                const enriched = libRef ? { ...ref, ...libRef } : ref;
                                                if (hasIssues(enriched)) { statusLabel = 'Has Issue'; statusStyle = { bg: '#fef2f2', color: '#dc2626' }; }
                                                else if (isDeprecated(enriched)) { statusLabel = 'Deprecated'; statusStyle = { bg: '#fef3c7', color: '#b45309' }; }
                                                return (
                                                    <tr key={ref.id || ref.title}>
                                                        <td style={{ width: 80, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#000' }}>{refId}</td>
                                                        <td style={{ width: 340, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ref.title}</td>
                                                        <td style={{ width: 180, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ref.authors || '—'}</td>
                                                        <td style={{ width: 200, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#000' }}>
                                                            {ref.type ? (
                                                                <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500, background: tc.bg, color: tc.color }}>{ref.type}</span>
                                                            ) : '—'}
                                                        </td>
                                                        <td style={{ width: 80, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#000', textAlign: 'center' }}>{ref.year || '—'}</td>
                                                        <td style={{ width: 150, padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#000', textAlign: 'center' }}>
                                                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: statusStyle.bg, color: statusStyle.color }}>{statusLabel}</span>
                                                        </td>
                                                        <td style={{ flex: 1, padding: '10px 0 10px 12px', borderBottom: '1px solid #e5e7eb' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                                                <button onClick={() => setViewRef(enriched)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 500, color: '#111827', fontFamily: "'Poppins', sans-serif" }}>View</button>
                                                                <span style={{ color: '#d1d5db', fontSize: 18 }}>·</span>
                                                                <Link to={`/references/form/${code}/${ref.id}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 500, color: '#111827', textDecoration: 'none', fontFamily: "'Poppins', sans-serif" }}>Edit</Link>
                                                                <span style={{ color: '#d1d5db', fontSize: 18 }}>·</span>
                                                                <button onClick={() => setDeleteConfirmRef(ref)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 500, color: '#dc2626', fontFamily: "'Poppins', sans-serif" }}>Delete</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr className={styles.emptyRow}>
                                                <td colSpan={6}>
                                                    <div className={styles.emptyStateContainer}>
                                                        <Inbox size={40} strokeWidth={1} />
                                                        <span>No references added yet.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                    </div>
                                </div>
                            </section>
                        }

                        {selectedSection === 'Topics' &&
                            <section>
                                <div className={styles['topics-container']}>
                                    <div className={styles['topics-header']}>
                                        <div className={'search-container'}>
                                            <div className={'search-bar'}>
                                                <Search size={18}/>
                                                <input placeholder={"Search topic name"} type="text"/>
                                            </div>
                                        </div>

                                        <Link to={'/topics/form/:id'}>
                                            <div className={'add-button'}>
                                                <Plus size={16} strokeWidth={3}/> Add Topic
                                            </div>
                                        </Link>
                                    </div>

                                    <table>
                                        <thead>
                                        <tr>
                                            <th width={400}>TITLE</th>
                                            <th className={styles.fill} ></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {/* CHECK: Are there topics? */}
                                        {syllabus.topics && syllabus.topics.length > 0 ? (
                                            syllabus.topics.map((topic) => (
                                                <tr key={topic.id}>
                                                    <td>{topic.title}</td>
                                                    <td className={styles.fill}>
                                                        <Link className={'actionLink'} to={`/topics/form/${code}/${topic.id}`}>
                                                            Open <ChevronRight size={18}/>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* EMPTY STATE */
                                            <tr className={styles.emptyRow}>
                                                <td colSpan={2}>
                                                    <div className={styles.emptyStateContainer}>
                                                        <Inbox size={40} strokeWidth={1} />
                                                        <span>No topics created yet.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        }

                        {selectedSection === 'Intended Learning Outcomes' &&
                            <section>
                                <div className={styles['ilo-container']}>
                                    <table>
                                        <thead>
                                        <tr>
                                            <th width={400}>Entry ID</th>
                                            <th className={styles.fill} ></th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {/* CHECK: Are there ILOs? */}
                                        {syllabus.ilos && syllabus.ilos.length > 0 ? (
                                            syllabus.ilos.map((ilo) => (
                                                <tr key={ilo.id}>
                                                    <td>{ilo.id}</td>
                                                    <td className={styles.fill}>
                                                        <Link className={'actionLink'} to={`/ilos/form/${code}/${ilo.id}`}>
                                                            Open <ChevronRight size={18}/>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* EMPTY STATE */
                                            <tr className={styles.emptyRow}>
                                                <td colSpan={2}>
                                                    <div className={styles.emptyStateContainer}>
                                                        <Inbox size={40} strokeWidth={1} />
                                                        <span>No ILOs found.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        }

                        {selectedSection === 'Assessments' &&
                            <section>
                                <div className={styles['assessments-container']}>
                                    <div className={styles['assessments-header']}>
                                        <div className={'search-container'}>
                                            <div className={'search-bar'}>
                                                <Search size={18}/>
                                                <input placeholder={"Search TLA name"} type="text"/>
                                            </div>
                                        </div>

                                        <div className={'filter-container'}>
                                            <p>Filter by <strong>Class Phase</strong>:</p>
                                            <select name="phase">
                                                <option value="">All</option>
                                                <option value="Pre-Class">Pre-Class</option>
                                                <option value="In-Class">In-Class</option>
                                                <option value="Post-Class">Post-Class</option>
                                            </select>
                                        </div>
                                    </div>

                                    <table>
                                        <thead>
                                        <tr>
                                            <th width={150}>CO‑ILO</th>
                                            <th width={350}>TLA NAME</th>
                                            <th width={450}>TOPIC</th>
                                            <th width={200}>CLASS PHASE</th>
                                            <th className={styles.fill}></th>
                                        </tr>
                                        </thead>

                                        <tbody>
                                        {/* CHECK: Are there assessments? */}
                                        {syllabus.assessments && syllabus.assessments.length > 0 ? (
                                            syllabus.assessments.map((assessment) => (
                                                <tr key={assessment.id}>
                                                    <td width={150}>{getCoIloByTlaName(assessment.tlaName)}</td>
                                                    <td width={350}>{assessment.tlaName}</td>
                                                    <td width={450}>
                                                        {getTopicByTlaName(assessment.tlaName)}
                                                    </td>
                                                    <td width={300}>{assessment.phase}</td>
                                                    <td className={styles.fill}>
                                                        <Link className={'actionLink'} to={`/assessments/form/${code}/${assessment.id}`}>
                                                            Open <ChevronRight size={18}/>
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            /* EMPTY STATE */
                                            <tr className={styles.emptyRow}>
                                                {/* colSpan is 4 because there are 4 table headers (TLA Name, Topic, Phase, Empty HeaderA) */}
                                                <td colSpan={4}>
                                                    <div className={styles.emptyStateContainer}>
                                                        <Inbox size={40} strokeWidth={1} />
                                                        <span>No Teaching & Learning Activities added yet.</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        }
                        {selectedSection === 'Criteria for Grading' && (
                            <section>
                                <React.Suspense fallback={<div></div>}>
                                    <CriteriaForm syllabusCode={code} />
                                </React.Suspense>
                            </section>
                        )}

                        <SyllabusPreview
                            isOpen={isPreviewOpen}
                            onClose={() => setIsPreviewOpen(false)}
                            onSubmit={handleSubmitConfirm}
                        />

                    </>
                )}

                {/* ── VIEW REFERENCE MODAL (director style) ──────────────────── */}
                {viewRef && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }} onClick={() => setViewRef(null)}>
                        <div style={{ background: 'white', borderRadius: 16, width: 560, maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#000' }}>REFERENCE DETAILS</h2>
                                <button onClick={() => setViewRef(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#9ca3af', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>✕</button>
                            </div>
                            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                                {isDeprecated(viewRef) && (
                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#b45309', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>⚠️</span> This reference is over 5 years old and may be outdated.
                                    </div>
                                )}
                                {hasIssues(viewRef) && (
                                    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span>🚫</span> This reference has a reported issue and instructors cannot use it.
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>REFERENCE ID</span>
                                    <span style={{ fontSize: 15, color: '#000' }}>{viewRef.id}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>TITLE</span>
                                    <span style={{ fontSize: 15, color: '#000' }}>{viewRef.title}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>AUTHOR(S)</span>
                                    <span style={{ fontSize: 15, color: '#000' }}>{viewRef.authors}</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>TYPE</span>
                                        <span style={{ fontSize: 15, color: '#000' }}>{viewRef.type || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>YEAR</span>
                                        <span style={{ fontSize: 15, color: '#000' }}>{viewRef.year || '—'}</span>
                                    </div>
                                </div>
                                {viewRef.type === 'Textbook' && viewRef.isbn && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>ISBN</span>
                                        <span style={{ fontSize: 15, color: '#000' }}>{viewRef.isbn}</span>
                                    </div>
                                )}
                                {viewRef.type !== 'Textbook' && viewRef.link && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>LINK</span>
                                        <a href={viewRef.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 15, color: '#00f', textDecoration: 'underline' }}>{viewRef.link}</a>
                                    </div>
                                )}
                                {viewRef.publisher && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em' }}>PUBLISHER</span>
                                        <span style={{ fontSize: 15, color: '#000' }}>{viewRef.publisher}</span>
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, padding: '16px 28px 24px', borderTop: '1px solid #f3f4f6', justifyContent: 'flex-end' }}>
                                <button onClick={() => setViewRef(null)} style={{ padding: '10px 20px', background: 'transparent', color: '#000', border: '1px solid #A4A9AF', borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Close</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── TOAST ──────────────────────────────────────────────────── */}
                {toast && (
                    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1100, background: toast.type === 'warning' ? '#dc2626' : '#047857', color: 'white', padding: '14px 24px', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideIn 0.3s ease' }}>
                        {toast.type === 'warning' ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="16 8 10 16 7 13" /></svg>
                        )}
                        {toast.msg}
                    </div>
                )}

                {/* ── DELETE CONFIRMATION MODAL ──────────────────────────────── */}
                {deleteConfirmRef && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }} onClick={() => setDeleteConfirmRef(null)}>
                        <div style={{ background: 'white', borderRadius: 14, width: 420, maxWidth: '90vw', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Poppins', sans-serif" }} onClick={(e) => e.stopPropagation()}>
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 16 }}>
                                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 10px' }}>Remove Reference</h3>
                            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }}>
                                Are you sure you want to remove <strong>"{deleteConfirmRef.title}"</strong> from this syllabus? This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                <button onClick={() => setDeleteConfirmRef(null)} style={{ padding: '10px 24px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Cancel</button>
                                <button onClick={() => {
                                    const idx = syllabus.references.findIndex(r => r.id === deleteConfirmRef.id);
                                    if (idx !== -1) syllabus.references.splice(idx, 1);
                                    setRefDeleteKey(k => k + 1);
                                    setDeleteConfirmRef(null);
                                }} style={{ padding: '10px 24px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 20, fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>Remove</button>
                            </div>
                        </div>
                    </div>
                )}


            </div>
        </div>
    )
}

export default SyllabusSections;