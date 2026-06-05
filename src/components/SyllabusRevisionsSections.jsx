import styles from '../styles/SyllabusSections.module.sass'
import {ChevronLeft, ChevronRight, Plus, Search, Inbox, MessageSquare} from 'react-feather';
import { Info } from 'react-feather';
import React, {useEffect, useMemo, useState} from "react";
import TextField from "./TextField.jsx";
import TextArea from "./TextArea.jsx";
import {Link, useNavigate, useParams, useSearchParams} from "react-router-dom";
import {getSyllabusByCode, syllabiData} from "../data/syllabiData.js";
import { getWorkflow, setWorkflow } from '../utils/workflowHelpers.js';
import { getSuggestions, acceptSuggestion, rejectSuggestion } from '../utils/dataStore.js';
import SyllabusPreview from "./SyllabusPreview.jsx";

const SyllabusRevisionsSections = ({status}) => {

    const [searchParams, setSearchParams] = useSearchParams();
    const selectedSection = searchParams.get('section') || 'Course Details';

    // syllabus code from route (ensure this is available to effects that load/save comments)
    const { code, approver } = useParams();

    // Loading State
    const [isLoading, setIsLoading] = useState(false);

    // Workflow state (lazy-init from localStorage)
    const [workflow, setWorkflowState] = useState(() => code ? getWorkflow(code) : null);
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    const [suggestions, setSuggestions] = useState([]);
    const [suggestionRefreshKey, setSuggestionRefreshKey] = useState(0);

    useEffect(() => {
        if (code) {
            setSuggestions(getSuggestions(code))
        }
    }, [code, suggestionRefreshKey]);

    const handleAcceptSuggestion = (id) => {
        acceptSuggestion(id);
        setSuggestionRefreshKey(k => k + 1);
    };

    const handleRejectSuggestion = (id) => {
        rejectSuggestion(id);
        setSuggestionRefreshKey(k => k + 1);
    };

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

    // globalComments holds a single list of reviewer comments shown across all sections
    const [globalComments, setGlobalComments] = useState([]);

    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);
        // load persisted global approval comments (show same comments across sections)
        (function loadComments() {
            try {
                const raw = localStorage.getItem('approval_comments_v1')
                const all = raw ? JSON.parse(raw) : []
                const commentsArray = Array.isArray(all) ? all : []
                const filtered = commentsArray.filter(c => c.courseCode === code)
                setGlobalComments(filtered)
            } catch (e) {
                setGlobalComments([])
            }
        })()

        return () => clearTimeout(timer);
    }, [selectedSection, code]);

    const handleSectionChange = (e) => {
        setSearchParams({ section: e.target.value })
    }

    // Get comments to display (global)
    const currentComments = globalComments || [];
    const visibleComments = useMemo(() => {
        // Instructor view: hide unresolved Dean relay comments
        return currentComments.filter(c => {
            if (c.recipientRole === 'program_head' && !c.resolved) return false
            return true
        })
    }, [currentComments]);

    const saveGlobalCommentsToStorage = (updatedGlobalComments) => {
        try {
            const raw = localStorage.getItem('approval_comments_v1')
            const all = raw ? JSON.parse(raw) : []
            const commentsArray = Array.isArray(all) ? all : []
            
            const newAll = commentsArray.map(c => {
                const updated = updatedGlobalComments.find(u => u.id === c.id)
                return updated || c
            })
            
            localStorage.setItem('approval_comments_v1', JSON.stringify(newAll))
        } catch (e) {
            console.error('Failed to persist global comments', e)
        }
    }

    const markCommentResolved = (commentId) => {
        const updated = (globalComments || []).map(c => c.id === commentId ? { ...c, resolved: true, status: 'resolved', resolvedAt: new Date().toISOString() } : c)
        setGlobalComments(updated)
        saveGlobalCommentsToStorage(updated)
    }

    // Use the canonical syllabi data source. If the route `code` doesn't match any
    // syllabus, fall back to the first syllabus in `syllabiData` so the revisions
    // page always displays data from `src/data/syllabiData.js` (e.g. BSCS313L).
    const syllabus = getSyllabusByCode(code) || (syllabiData && syllabiData.length ? syllabiData[0] : null);

    const courseOutcomes = (syllabus && syllabus.courseOutcomes) || [];

    const programOutcomes = ['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'];

    const CriteriaForm = React.lazy(() => import('../pages/CriteriaForGradingForm.jsx'));

    // local editable copy so Open buttons can edit inline (prompt-based)
    const [editableSyllabus, setEditableSyllabus] = useState(syllabus)
    useEffect(() => { setEditableSyllabus(syllabus) }, [syllabus])
    
    // basic prompt-based editors
    const editTopic = (topicId) => {
        const topic = (editableSyllabus?.topics || []).find(t => t.id === topicId)
        if (!topic) return
        const newTitle = window.prompt('Edit topic title', topic.title || '')
        if (newTitle === null) return
        const subInput = window.prompt('Subtopics (comma-separated)', (topic.subtopics || []).map(s => s.value).join(', '))
        if (subInput === null) return
        const newSubs = subInput.split(',').map((s, idx) => ({ id: `${topicId}-sub-${idx}`, value: s.trim() })).filter(s => s.value)
        const updatedTopics = (editableSyllabus?.topics || []).map(t => t.id === topicId ? { ...t, title: newTitle, subtopics: newSubs } : t)
        setEditableSyllabus({ ...editableSyllabus, topics: updatedTopics })
    }

    const editAssessment = (assessmentId) => {
        const assess = (editableSyllabus?.assessments || []).find(a => a.id === assessmentId)
        if (!assess) return
        const newMethod = window.prompt('Edit assessment method for ' + (assess.tlaName || assessmentId), assess.assessmentMethod || '')
        if (newMethod === null) return
        const updated = (editableSyllabus?.assessments || []).map(a => a.id === assessmentId ? { ...a, assessmentMethod: newMethod } : a)
        setEditableSyllabus({ ...editableSyllabus, assessments: updated })
    }

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Hard-coded seed data for reviewers
    const getReviewerSeedData = (index = 0) => {
        const reviewerSeeds = [
            { name: 'SANTOS, MARIA', role: 'Director of Libraries' },
            { name: 'REYES, AGNES', role: 'Dean' },
            { name: 'DANILA, JUNAR', role: 'Program Head' },
            { name: 'CRUZ, ROBERTO', role: 'Industry Consultant' },
        ]
        return reviewerSeeds[index % reviewerSeeds.length]
    }

    // Reviewer role colors (use dark tones, avoid bright blue)
    const getRoleColor = (role) => {
        const colors = {
            'Program Head': '#2d3748',
            'Dean': '#2d3748',
            'Director of Libraries': '#2d3748',
            'Industry Consultant': '#2d3748'
        };
        return colors[role] || '#2d3748';
    };

    // Get component tags for display.
    // Show every selected item and also display the explicit coverageType if chosen.
    const getComponentTags = (comment) => {
        const components = comment?.components || {}
        const tags = []
        const isSelected = (key) => {
            const v = components[key]
            return v === true || v === 1 || v === '1' || v === 'true'
        }

        // Always show references/grading when set
        if (isSelected('references')) tags.push('References')
        if (isSelected('grading')) tags.push('Grading Criteria')

        // Also show explicit coverageType (if selected) as an additional tag
        if (comment?.coverageType) {
            const ct = String(comment.coverageType || '').trim()
            if (ct) tags.push(`Coverage: ${ct}`)
        }

        return tags
    };

    // helper: recent flag (used to mark comments as "New")
    const isRecent = (iso, days = 7) => {
        if (!iso) return false
        try {
            const then = new Date(iso)
            const diff = Date.now() - then.getTime()
            return diff < days * 24 * 60 * 60 * 1000
        } catch (e) {
            return false
        }
    }

    return(
        <div className={styles.container}>
            <div style={{position: 'relative', display: 'flex', gap: '4px', paddingRight: '0', alignItems: 'stretch', minHeight: 'calc(100vh - 80px)'}}>
                <div style={{flex: 1, maxWidth: 'calc(100% - 364px)', display: 'flex', flexDirection: 'column', height: '100%', paddingRight: '8px'}}>
                    <div className={styles.navi}>
                        <Link  to={`/`} className={'actionLink'} state={{ from: '/' }}>
                            <div className={styles.return}>
                                <ChevronLeft size={22}/>
                            </div>
                        </Link>


                        <div className={styles['section-select']} style={{marginLeft: 'auto', marginRight: '12px'}}>
                            <select value={selectedSection} onChange={handleSectionChange}>
                                <option value="Course Details">Course Details</option>
                                <option value="Course and Program Outcome Alignment">Course and Program Outcome Alignment</option>
                                <option value="References">References</option>
                                <option value="Topics">Topics & Teaching and Learning Activities</option>
                                <option value="Intended Learning Outcomes">Intended Learning Outcomes</option>
                                <option value="Assessments">Assessments</option>
                            </select>
                        </div>

                        <div onClick={handleSaveDraft} className={styles.draft}>{workflow?.currentStage && workflow?.currentStage !== 'submitted' ? 'Save' : 'Save as Draft'}</div>

                        <div onClick={() => {
                            const stage = workflow?.currentStage
                            if (stage === 'returned') {
                                const hasUnresolved = (globalComments || []).some(c => !c.resolved)
                                if (hasUnresolved) {
                                    showToast('Please address all reviewer comments first before submitting your revision.', 'warning')
                                    return
                                }
                            }
                            setIsPreviewOpen(true)
                        }} className={styles.submit}>{workflow?.currentStage === 'returned' ? 'Submit Revision' : 'Submit'}</div>
                    </div>

                    <div className={styles['dynamic-sections']} style={{marginTop: '8px'}}>

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
                                                    <p><strong>E</strong> - An Enabling Course</p>
                                                    <p><strong>D</strong> - A Demonstrative Course</p>
                                                </div>
                                            </div>

                                            <table>
                                                <thead>
                                                <tr>
                                                    <th className={styles['course-descrip']}>After completing the course, the student should be able to:</th>
                                                    <th width={82}>PO1</th>
                                                    <th width={82}>PO2</th>
                                                    <th width={82}>PO3</th>
                                                    <th width={82}>PO4</th>
                                                    <th width={82}>PO5</th>
                                                    <th width={82}>PO6</th>
                                                    <th width={82}>PO7</th>
                                                    <th width={82}>PO8</th>
                                                    <th width={82}>PO9</th>
                                                </tr>
                                                </thead>

                                                <tbody>
                                                {courseOutcomes.map((co, coIndex) => (
                                                    <tr key={co.id}>
                                                        <td className={styles.courseNo}>
                                                            {co.id}
                                                        </td>

                                                        <td className={styles.courseDescripInput}>
                                                            <TextArea initialValue={co.description} rows={8} />
                                                        </td>

                                                        {[...Array(9)].map((_, poIndex) => (
                                                            <td className={styles.dropdownOptions} key={poIndex}>
                                                                <select defaultValue={co.poMappings[poIndex] || ''}>
                                                                            <option value="">-</option>
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
                                        <div className={styles['references-container']}>
                                            <div className={styles['references-header']}>
                                                <div className={'search-container'}>
                                                    <div className={'search-bar'}>
                                                        <Search size={18}/>
                                                        <input placeholder={"Search reference name"} type="text"/>
                                                    </div>
                                                </div>

                                                <div className={'filter-container'}>
                                                    <p>Filter by <strong>Reference Type</strong>:</p>
                                                    <select name="" >
                                                        <option value="">Textbook</option>
                                                        <option value="">Open Educational Resources</option>
                                                        <option value="">Online Resources</option>
                                                    </select>
                                                </div>

                                                <Link to={'/references/form/:id'}>
                                                    <div className={'add-button'}>
                                                        <Plus size={16} strokeWidth={3}/> Add Reference
                                                    </div>
                                                </Link>
                                            </div>

                                            <table>
                                                <thead>
                                                <tr>
                                                    <th width={200}>REFERENCE ID</th>
                                                    <th width={400}>TITLE</th>
                                                    <th className={styles.fill} ></th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {syllabus?.references && syllabus.references.length > 0 ? (
                                                    syllabus.references.map((ref) => (
                                                        <tr key={ref.id}>
                                                            <td width={200}>{ref.id}</td>
                                                            <td width={400}>{ref.title}</td>
                                                            <td className={styles.fill}>
                                                                <Link className={'actionLink'} to={`/references/form/${code}/${ref.id}`}>
                                                                    Open <ChevronRight size={18} />
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr className={styles.emptyRow}>
                                                        <td colSpan={3}>
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
                                                {syllabus?.topics && syllabus.topics.length > 0 ? (
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
                                                {syllabus?.ilos && syllabus.ilos.length > 0 ? (
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
                                                    <th width={400}>TLA NAME</th>
                                                    <th width={400}>TOPIC</th>
                                                    <th width={350}>CLASS PHASE</th>
                                                    <th className={styles.fill}></th>
                                                </tr>
                                                </thead>

                                                <tbody>
                                                {syllabus?.assessments && syllabus.assessments.length > 0 ? (
                                                    syllabus.assessments.map((assessment) => (
                                                        <tr key={assessment.id}>
                                                            <td width={400}>{assessment.tlaName}</td>
                                                            <td width={400}>{assessment.topic}</td>
                                                            <td width={350}>{assessment.phase}</td>
                                                            <td className={styles.fill}>
                                                                <Link className={'actionLink'} to={`/assessments/form/${code}/${assessment.id}`}>
                                                                    Open <ChevronRight size={18}/>
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr className={styles.emptyRow}>
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
                                        <React.Suspense fallback={<div>Loading...</div>}>
                                            <CriteriaForm syllabusCode={code} assessmentOptions={(editableSyllabus?.assessments || []).map(a => a.tlaName)} />
                                        </React.Suspense>
                                    </section>
                                )}

                                <SyllabusPreview
                                    isOpen={isPreviewOpen}
                                    onClose={() => setIsPreviewOpen(false)}
                                    syllabus={syllabus}
                                    onSubmit={handleSubmitConfirm}
                                />
                            </>
                        )}


                    </div>
                </div>


                {/* Comments Sidebar - Section Specific */}
                {selectedSection === 'Intended Learning Outcomes' && (
                <aside style={{
                    position: 'sticky',
                    right: '0',
                    top: '20px',
                    width: '360px',
                    height: 'calc(100vh - 80px)',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    marginRight: '4px',
                    paddingLeft: '4px'
                }}>
                    <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #e0e0e0',
                        background: '#fafafa',
                        boxSizing: 'border-box',
                        width: '100%'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                            width: '100%'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MessageSquare size={20} strokeWidth={2} color="#4a5568" />
                                <h4 style={{
                                    margin: 0,
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    color: '#2d3748'
                                }}>
                                    Comments
                                </h4>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', justifyContent: 'flex-end' }}>
                                <span style={{
                                    fontSize: '12px',
                                    color: '#718096',
                                    fontWeight: 500
                                }}>
                                    {visibleComments.length} {visibleComments.length === 1 ? 'comment' : 'comments'}
                                </span>
                            </div>
                        </div>
                        <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#718096',
                            fontWeight: 500
                        }}>
                            {selectedSection}
                        </p>
                    </div>

                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '12px',
                        boxSizing: 'border-box',
                        width: '100%'
                    }}>
                        {visibleComments.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px 20px',
                                color: '#a0aec0'
                            }}>
                                <Inbox size={48} strokeWidth={1.5} style={{margin: '0 auto 12px'}} />
                                <p style={{fontSize: '14px', margin: 0}}>No comments yet</p>
                                <p style={{fontSize: '12px', marginTop: '4px'}}>This section has no reviewer comments</p>
                            </div>
                        ) : (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                                {
                                    (() => {
                                        const groups = {}
                                        visibleComments.forEach((c) => {
                                            const sid = c.submissionId || 'single'
                                            groups[sid] = groups[sid] || { submissionLabel: c.submissionLabel || sid, submittedAt: c.submittedAt || c.createdAt || null, items: [] }
                                            groups[sid].items.push(c)
                                        })

                                        Object.values(groups).forEach(g => {
                                            g.items = (g.items || []).slice().sort((a, b) => {
                                                const aa = a.createdAt || a.submittedAt || ''
                                                const bb = b.createdAt || b.submittedAt || ''
                                                return aa.localeCompare(bb)
                                            })
                                        })

                                        const ordered = Object.values(groups).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))
                                        return ordered.map((g, gi) => (
                                            <div key={gi} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#2d3748' }}>{g.submissionLabel}{g.submittedAt ? ` — ${new Date(g.submittedAt).toLocaleString()}` : ''}</div>
                                                {g.items.map((comment, idx) => {
                                                    const componentTags = getComponentTags(comment);
                                                    return (
                                                        <div key={comment.id} style={{
                                                            background: '#f7fafc',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '8px',
                                                            padding: '12px',
                                                            position: 'relative'
                                                        }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                marginBottom: '8px'
                                                            }}>
                                                                <div style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '8px'
                                                                }}>
                                                                        <div style={{
                                                                            width: '6px',
                                                                            height: '6px',
                                                                            borderRadius: '50%',
                                                                            background: getRoleColor(comment.role)
                                                                        }}></div>
                                                                        {
                                                                            (() => {
                                                                                const name = comment.reviewer && String(comment.reviewer).trim()
                                                                                const role = comment.role && String(comment.role).trim()
                                                                                
                                                                                // Use seed data if name or role is missing
                                                                                const seedIndex = visibleComments.indexOf(comment)
                                                                                const seedData = getReviewerSeedData(seedIndex) || {}
                                                                                
                                                                                const displayName = name || seedData.name || 'Reviewer'
                                                                                const displayRole = role || seedData.role || 'Approver'
                                                                                
                                                                                return (
                                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
  <span style={{
    fontSize: '13px',
    fontWeight: 600,
    color: '#2d3748'
  }}>
    {displayName}
  </span>
  {displayRole && (
    <span
      title={displayRole}
      style={{
        fontSize: '12px',
        color: getRoleColor(displayRole) || '#718096',
        marginTop: 2,
        fontWeight: 500
      }}
    >
      {displayRole}
    </span>
  )}
</div>

                                                                                )
                                                                            })()
                                                                        }
                                                                    {isRecent(comment.createdAt || comment.submittedAt || comment.timestamp, 7) && (
                                                                        <span style={{
                                                                            marginLeft: 8,
                                                                            fontSize: '11px',
                                                                            background: '#2d3748',
                                                                            color: '#fff',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '12px',
                                                                            fontWeight: 600
                                                                        }}>New</span>
                                                                    )}
                                                                </div>
                                                                <span style={{
                                                                    fontSize: '11px',
                                                                    color: '#a0aec0'
                                                                }}>
                                                                    Comment {idx + 1}
                                                                </span>
                                                            </div>

                                                            {componentTags.length > 0 && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    flexWrap: 'wrap',
                                                                    gap: '6px',
                                                                    marginBottom: '8px'
                                                                }}>
                                                                    {componentTags.map((tag, i) => (
                                                                        <span key={i} style={{
                                                                            fontSize: '10px',
                                                                            color: '#4a5568',
                                                                            background: '#e2e8f0',
                                                                            padding: '2px 8px',
                                                                            borderRadius: '12px',
                                                                            fontWeight: 500
                                                                        }}>
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {(comment.courseOutcome || comment.ilo) && (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    marginBottom: '8px',
                                                                    fontSize: '11px',
                                                                    color: '#718096'
                                                                }}>
                                                                    {comment.courseOutcome && (
                                                                        <span style={{
                                                                            background: '#f0f4f8',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            <strong>CO:</strong> {comment.courseOutcome}
                                                                        </span>
                                                                    )}
                                                                    {comment.ilo && (
                                                                        <span style={{
                                                                            background: '#f0f4f8',
                                                                            padding: '2px 6px',
                                                                            borderRadius: '4px'
                                                                        }}>
                                                                            <strong>ILO:</strong> {comment.ilo}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <p style={{
                                                                fontSize: '13px',
                                                                lineHeight: '1.6',
                                                                color: '#4a5568',
                                                                margin: '0 0 8px 0'
                                                            }}>
                                                                {comment.comment}
                                                            </p>

                                                            {comment.suggestedRefs && comment.suggestedRefs.length > 0 && (
                                                                <div style={{ marginTop: 8, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Suggested References:</div>
                                                                    {comment.suggestedRefs.map((sr, si) => (
                                                                        <div key={si} style={{ fontSize: 12, color: '#78350f', marginBottom: 2 }}>
                                                                            {sr.title}{sr.authors ? ` — ${sr.authors}` : ''}{sr.year ? ` (${sr.year})` : ''}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            <div style={{
                                                                fontSize: '11px',
                                                                color: '#a0aec0',
                                                                marginTop: '8px'
                                                            }}>
                                                                {(() => {
                                                                    const ts = comment.createdAt || comment.submittedAt || comment.timestamp || null
                                                                    return ts ? new Date(ts).toLocaleString() : ''
                                                                })()}
                                                                {(() => {
                                                                    const roleCanMark = { 'instructor': 'instructor', 'program-head': 'program_head' }
                                                                    const roleKeyToLabel = { 'instructor': 'Instructor', 'program-head': 'Program Head', 'dean': 'Dean', 'director-of-libraries': 'Director of Libraries', 'industry-consultant': 'Industry Consultant' }
                                                                    const isRecipient = roleCanMark['instructor'] === comment.recipientRole
                                                                    const isSender = comment.role === roleKeyToLabel['instructor']
                                                                    if (comment.resolved) {
                                                                        const label = isSender ? 'Addressed ✓' : 'Resolved'
                                                                        return (
                                                                            <span style={{ marginLeft: 8, color: '#38a169', fontWeight: 600 }}>
                                                                                {label}{comment.resolvedAt ? `— ${new Date(comment.resolvedAt).toLocaleString()}` : ''}
                                                                            </span>
                                                                        )
                                                                    } else if (isRecipient) {
                                                                        return (
                                                                            <button 
                                                                                onClick={() => markCommentResolved(comment.id)} 
                                                                                style={{ marginLeft: 8, fontSize: 12, padding: '4px 8px', color: '#ffffff', backgroundColor: '#3182ce', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                                                            >
                                                                                Mark addressed
                                                                            </button>
                                                                        )
                                                                    }
                                                                    return null
                                                                })()}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ))
                                    })()
                                }
                            </div>
                        )}
                    </div>
                </aside>
                )}
            </div>

            {toast && (
                <div style={{
                    position: 'fixed', bottom: 32, right: 32, zIndex: 1100,
                    background: toast.type === 'warning' ? '#dc2626' : '#047857',
                    color: 'white', padding: '14px 24px',
                    borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: 'slideIn 0.3s ease'
                }}>
                    {toast.type === 'warning' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="16 8 10 16 7 13" /></svg>
                    )}
                    {toast.msg}
                </div>
            )}
        </div>
    )
}

export default SyllabusRevisionsSections;
