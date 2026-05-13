import React, { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Info } from 'react-feather'
import styles from '../styles/ApprovalSyllabusSections.module.sass'
import ApprovalCommentBox from './ApprovalCommentBox.jsx'
import { getSyllabusByCode, syllabiData } from '../data/syllabiData.js'

const defaultSections = [
  'Course Details',
  'Course and Program Outcome Alignment',
  'Course Coverage',
  'References',
  'Criteria for Grading'
]

const ApprovalSyllabusSections = ({ status = 'pending', currentRole = '', courseCode = '', embedded = false, externalSelectedSection = null }) => {
  const [searchParams] = useSearchParams()
  const [selectedSection, setSelectedSection] = useState(defaultSections[0])
  const statusParam = searchParams.get('status')
  const effectiveStatus = (statusParam || status).toLowerCase()
  const params = useParams()
  const navigate = useNavigate()

  const [showCommentModal, setShowCommentModal] = useState(false)

  // refs to sections for auto-scroll
  const courseDetailsRef = useRef(null)
  const alignmentRef = useRef(null)
  const coverageRef = useRef(null)
  const referencesRef = useRef(null)
  const criteriaRef = useRef(null)
  const containerRef = useRef(null)

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value)
  }
  
  const { code: routeCode } = useParams();
  const codeToUse = routeCode || courseCode || (syllabiData && syllabiData.length ? syllabiData[0].code : undefined)
  if (!routeCode && courseCode) console.debug('ApprovalSyllabusSections: using courseCode prop as fallback:', courseCode)
  if (!routeCode && !courseCode) console.debug('ApprovalSyllabusSections: no code param or prop; using first syllabiData entry:', codeToUse)
  const syllabus = getSyllabusByCode(codeToUse) || (syllabiData && syllabiData.length ? syllabiData[0] : undefined)

  // References view type
  const [viewType, setViewType] = useState('Textbook')

  // safe access to syllabus references (use resolved `syllabus` like SyllabusPreview)
  const allReferences = syllabus?.references || []
  const getData = (type) => (allReferences || []).filter(r => r.type === type)

  // scroll to selected section when it changes (respect externalSelectedSection when embedded)
  useEffect(() => {
    const active = externalSelectedSection || selectedSection
    const mapping = {
      [defaultSections[0]]: courseDetailsRef,
      [defaultSections[1]]: alignmentRef,
      [defaultSections[2]]: coverageRef,
      [defaultSections[3]]: referencesRef,
      [defaultSections[4]]: criteriaRef
    }

    const targetRef = mapping[active]
    if (!targetRef || !targetRef.current) return

    const container = containerRef.current
    const el = targetRef.current

    if (container && container.scrollTo) {
      const containerTop = container.getBoundingClientRect().top
      const elTop = el.getBoundingClientRect().top
      const offset = elTop - containerTop + container.scrollTop - 8
      container.scrollTo({ top: offset, behavior: 'smooth' })
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedSection, externalSelectedSection])

  const openComment = () => setShowCommentModal(true)
  const closeComment = () => setShowCommentModal(false)

  // derive role
  let storedUser = null
  try { storedUser = JSON.parse(localStorage.getItem('user') || 'null') } catch (e) { storedUser = null }

  const rawRoleSource = (currentRole && currentRole.toString()) || params?.approver || storedUser?.role || storedUser?.roles?.[0] || 'approver'
  const roleSource = String(rawRoleSource).toLowerCase()

  const roleKey = roleSource.includes('program')
    ? 'program-head'
    : roleSource.includes('dean')
      ? 'dean'
      : roleSource.includes('industry')
        ? 'industry-consultant'
        : (roleSource.includes('library') || roleSource.includes('libraries'))
          ? 'director-of-libraries'
          : roleSource.includes('instructor')
            ? 'instructor'
            : roleSource.includes('approver')
              ? 'approver'
              : 'approver'

  const backPath = roleKey === 'instructor' ? '/' : `/role/${roleKey}/approval-course-table`

  // COURSE & PROGRAM ALIGNMENT data (copied from SyllabusPreview)
  const courseOutcomes = [
    {
      id: 'CO1',
      description: 'Apply core concepts, theories, and principles of Human-Computer Interface (HCI) in proposing a User Interface (UI) design using Figma to translate a design brief into interactive screen layouts and UI components with a high-fidelity prototype demonstrating clarity, consistency, and appropriate use of visual hierarchy.',
      poMappings: ['E', '', 'I', '', '', 'E', '', '', 'I']
    },
    {
      id: 'CO2',
      description: 'User-Centered Design (UCD) principles and ISO 9241-210 standards with given user personas, contextual task flows, and feedback artifacts to develop a User Experience (UX) design that demonstrates user involvement, iterative refinement, and contextual understanding, as evaluated against established UX design criteria.',
      poMappings: ['', 'E', '', '', '', 'E', '', 'I', '']
    },
    {
      id: 'CO3',
      description: 'Construct a front-end prototype for a proposed software application by applying HCI design principles, UI/UX laws, accessibility standards, and web accessibility guidelines that demonstrate compliance with best practices in usability, inclusivity, and user engagement.',
      poMappings: ['', '', 'D', '', 'D', '', 'I', '', '']
    },
    {
      id: 'CO4',
      description: 'Justify the front-end prototype of a proposed software application based on usability testing results and user feedback by providing evidence-based rationale that addresses at least 80% of identified usability issues and aligns with user experience goals.',
      poMappings: ['D', '', '', 'E', '', '', '', 'I', '']
    }
  ]

  const sampleILOs = [
    'CO0-ILO0',
    'CO1-ILO1',
    'CO1-ILO2',
    'CO1-ILO3',
    'CO2-ILO1',
    'CO2-ILO2',
    'CO2-ILO3',
    'CO3-ILO1'
  ]

  const handleSubmitComment = (payload) => {
    console.log('Submitted approval comment', { ...payload, role: roleKey })
    setShowCommentModal(false)

    try {
      const storageKey = 'syllabus_comments_v1'
      const raw = localStorage.getItem(storageKey)
      const all = raw ? JSON.parse(raw) : {}

      const code = codeToUse
      if (!code) {
        console.warn('No syllabus code available to attach comment')
        return
      }

      // create a submission id shared by all comments being submitted now
      const now = new Date()
      const submissionId = `${code}-${now.getTime()}`
      const submittedAt = payload.createdAt || now.toISOString()
      const submissionLabel = `Submission ${new Date(submittedAt).toLocaleString()}`

      const reviewer = storedUser?.name || (roleKey === 'instructor' ? 'Instructor' : 'Approver')
      const roleLabel = roleKey === 'program-head' ? 'Program Head'
        : roleKey === 'dean' ? 'Dean'
        : roleKey === 'industry-consultant' ? 'Industry Consultant'
        : roleKey === 'director-of-libraries' ? 'Director of Libraries'
        : roleKey === 'instructor' ? 'Instructor'
        : 'Department Head'

      const sectionToSave = externalSelectedSection || selectedSection
      const prepared = (payload.comments || []).map((c, i) => ({
        id: `${submissionId}-${c.id}`,
        submissionId,
        submissionLabel,
        submittedAt,
        createdAt: new Date().toISOString(),
        reviewer,
        role: roleLabel,
        components: c.components || {},
        comment: c.text || '',
        courseOutcome: c.courseOutcome || null,
        ilo: c.ilo || null,
        status: 'pending',
        resolved: false
      }))

      const existingForCode = all[code] || {}
      const existingSection = existingForCode[sectionToSave] || []
      existingForCode[sectionToSave] = [...existingSection, ...prepared]
      all[code] = existingForCode
      localStorage.setItem(storageKey, JSON.stringify(all))

      console.debug('Saved approver comments', { code, section: selectedSection, count: prepared.length })
    } catch (e) {
      console.error('Failed to persist approval comment', e)
    }
  }

  // Helper for references column widths
  const colWidths = {
    id: '80px',
    title: '400px',
    author: '250px',
    link: '300px',
    year: '150px'
  }

  // Calculate total function
  const calculateTotal = (period) => {
    const gradingSystem = syllabus?.gradingSystem || []
    let total = 0
    gradingSystem.forEach(group => {
      if (group.ilos) {
        group.ilos.forEach(ilo => {
          total += Number(ilo.weight?.[period] || 0)
        })
      }
    })
    return total
  }

  useEffect(() => {
    if (!defaultSections.includes(selectedSection)) setSelectedSection(defaultSections[0])
  }, [selectedSection])

  const activeSelectedSection = externalSelectedSection || selectedSection

  return (
    <div className={styles.container}>
      {!embedded && (
        <div className={styles.navi}>
          <Link to={backPath} className={'actionLink'}>
            <div className={styles.return}>
              <ChevronLeft size={22} />
            </div>
          </Link>

          <div className={styles['section-select']}>
            <select value={selectedSection} onChange={handleSectionChange}>
              {defaultSections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* approval controls */}
          <div className={styles.actions} style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {effectiveStatus !== 'approved' && roleKey !== 'instructor' && (
              <div className={styles.approvalButtons}>
                <button className={styles.requestRevision} onClick={openComment}>Add Comment</button>
                <button className={styles.approve}>Approve</button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles['dynamic-sections']} ref={containerRef}>
        {/* COURSE DETAILS (copied from SyllabusPreview) */}
        {activeSelectedSection === 'Course Details' && (
          <section ref={courseDetailsRef}>
            <div className={styles.courseDetailsContainer}>
              <table className={styles.documentTable}>
                <tbody>
                <tr>
                  <th className={styles.labelCell}>Course No.</th>
                  <td className={styles.valueCell}>{syllabus?.code || ''}</td>
                  <th className={styles.descHeader}>Course Description</th>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Course Title</th>
                  <td className={styles.valueCell}><strong>{syllabus?.name || ''}</strong></td>
                  <td rowSpan="9" className={styles.descCell}>{syllabus?.description || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Credit</th>
                  <td className={styles.valueCell}>{syllabus?.credits || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Contact Hours/Week</th>
                  <td className={styles.valueCell}>{syllabus?.contact || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Pre-requisites</th>
                  <td className={styles.valueCell}>{syllabus?.prerequisites || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Classification/Field</th>
                  <td className={styles.valueCell}>{syllabus?.class || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>CMO</th>
                  <td className={styles.valueCell}>{syllabus?.cmo || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Syllabus Revision No.</th>
                  <td className={styles.valueCell}>{syllabus?.revision || '0'}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Year Level</th>
                  <td className={styles.valueCell}>{syllabus?.year || ''}</td>
                </tr>
                <tr>
                  <th className={styles.labelCell}>Term</th>
                  <td className={styles.valueCell}>{syllabus?.sem || ''}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Course and Program Outcome Alignment (copied) */}
        {activeSelectedSection === 'Course and Program Outcome Alignment' && (
          <section ref={alignmentRef}>
            <div className={styles['cpa-container']}>
              <div className={styles.legend}>
                <span className={styles.legendTitle}>Legend:</span>
                <div className={styles.legendItems}>
                  <span><strong>I</strong> – Introductory</span>
                  <span><strong>E</strong> – Enabling</span>
                  <span><strong>D</strong> – Demonstrative</span>
                </div>
              </div>

              <div className={styles.tableScrollWrapper}>
                <table className={styles.alignmentTable}>
                  <thead>
                  <tr>
                    <th className={styles.firstColHeader}>After completion of the course, the student should be able to:</th>
                    {['PO1', 'PO2', 'PO3', 'PO4', 'PO5', 'PO6', 'PO7', 'PO8', 'PO9'].map((po) => (
                      <th key={po} className={styles.poHeader}>{po}</th>
                    ))}
                  </tr>
                  </thead>
                  <tbody>
                  {courseOutcomes.map((co) => (
                    <tr key={co.id}>
                      <td className={styles.descCell}>
                        <strong>{co.id}: </strong>
                        {co.description}
                      </td>
                      {co.poMappings.slice(0, 9).map((mapping, index) => (
                        <td key={index} className={styles.mappingCell}>{mapping || ''}</td>
                      ))}
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Course Coverage (copied) */}
        {activeSelectedSection === 'Course Coverage' && (() => {
          const ilos = syllabus?.ilos || []
          const allTopics = syllabus?.topics || []
          const allAssessments = syllabus?.assessments || []

          const ccColWidths = {
            co: '60px',
            ilo: '220px',
            topic: '250px',
            period: '100px',
            tla: '350px',
            assess: '220px',
            ref: '100px'
          }

          const getILOTopics = (ilo) => {
            return (ilo.topics || []).map(topicTitle =>
              allTopics.find(t => t.title === topicTitle)
            ).filter(Boolean)
          }

          const getTLAsByPhase = (topics, phase) => {
            let tlas = []
            topics.forEach(topic => {
              if (topic.tlas) {
                const filtered = topic.tlas.filter(t => t.classPhase && t.classPhase.toLowerCase() === phase.toLowerCase())
                tlas = [...tlas, ...filtered]
              }
            })
            return tlas
          }

          const getAssessmentsForTLAs = (tlas) => {
            return tlas.map(tla =>
              allAssessments.find(a => a.tlaName === tla.tlaName)
            ).filter(Boolean)
          }

          const getRefId = (refString) => (refString || '').split(' - ')[0]

          const TlaGroup = ({ title, tlas }) => {
            if (!tlas || tlas.length === 0) return null
            return (
              <div className={styles.tlaGroupBlock}>
                <div className={styles.tlaPhaseHeader}>{title}</div>
                {tlas.map(tla => (
                  <div key={tla.id} className={styles.tlaItem}>
                    <div className={styles.tlaNameLine}>
                      <span className={styles.perfTag}>{tla.performedBy === 'Instructor' ? '[I]' : '[S]'}</span>
                      <span className={styles.boldText}> {tla.tlaName}</span>
                      {tla.laboratory && <span className={styles.labTag}> (Lab)</span>}
                    </div>
                    <div className={styles.descText}>{tla.tlaDescription}</div>
                  </div>
                ))}
              </div>
            )
          }

          return (
            <section ref={coverageRef}>
              <div className={styles.ccContainer}>
                <div className={styles.ccScrollWrapper}>
                  <table className={styles.ccTable}>
                    <thead>
                      <tr>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.co }}>CO</th>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.ilo }}>ILO</th>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.topic }}>TOPIC</th>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.period }}>PERIOD</th>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.assess }}>ASSESSMENT</th>
                        <th className={styles.ccHeader} style={{ width: ccColWidths.ref }}>RESOURCES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ilos.length > 0 ? ilos.map((ilo, index) => {
                        const isFirstOfCO = index % 3 === 0
                        const rowTopics = getILOTopics(ilo)

                        const preTLAs = getTLAsByPhase(rowTopics, 'Pre-class')
                        const inTLAs = getTLAsByPhase(rowTopics, 'In-class')
                        const postTLAs = getTLAsByPhase(rowTopics, 'Post-class')

                        const allRowTLAs = [...preTLAs, ...inTLAs, ...postTLAs]
                        const uniqueAssessments = [...new Set(getAssessmentsForTLAs(allRowTLAs))]

                        const cleanILOId = ilo.id ? (ilo.id.includes('-') ? ilo.id.split('-')[1] : ilo.id) : ''

                        return (
                          <tr key={ilo.id || index}>
                            {isFirstOfCO && (
                              <td rowSpan={3} className={`${styles.ccCell} ${styles.centerText} ${styles.boldText}`} style={{ width: ccColWidths.co }}>
                                {ilo.id ? ilo.id.split('-')[0] : ''}
                              </td>
                            )}

                            <td className={styles.ccCell} style={{ width: ccColWidths.ilo }}>
                              <div className={styles.boldText} style={{marginBottom: '5px'}}>{cleanILOId}</div>
                              {ilo.intendedLearningOutcome}
                            </td>

                            <td className={styles.ccCell} style={{ width: ccColWidths.topic }}>
                              {rowTopics.map(t => (
                                <div key={t.id} className={styles.topicBlock}>
                                  <div className={styles.topicTitle}>{t.title}</div>
                                  <ul className={styles.subtopicList}>
                                    {t.subtopics && t.subtopics.map(sub => (<li key={sub.id}>{sub.value}</li>))}
                                  </ul>
                                </div>
                              ))}
                            </td>

                            <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: ccColWidths.period }}>
                              <div className={styles.boldText}>{ilo.deliveryWeek}</div>
                              <div>{ilo.allocatedTime}</div>
                            </td>

                            <td className={styles.ccCell} style={{ width: ccColWidths.tla }}>
                              <TlaGroup title="PRE-CLASS" tlas={preTLAs} />
                              <TlaGroup title="IN-CLASS" tlas={inTLAs} />
                              <TlaGroup title="POST-CLASS" tlas={postTLAs} />
                              {allRowTLAs.length === 0 && <span className={styles.descText}>No activities listed.</span>}
                            </td>

                            <td className={styles.ccCell} style={{ width: ccColWidths.assess }}>
                              {uniqueAssessments.map((assess, i) => (
                                <div key={i} className={styles.assessItem}>
                                  <div className={styles.boldText}>{assess.tlaName}</div>
                                  <div className={styles.descText}>{assess.assessmentMethod}</div>
                                  {assess.hasRubric && <div className={styles.rubricTag}>Rubric Available</div>}
                                </div>
                              ))}
                            </td>

                            <td className={`${styles.ccCell} ${styles.centerText}`} style={{ width: ccColWidths.ref }}>
                              {(ilo.references || []).map((ref, i) => (<div key={i}>{getRefId(ref)}</div>))}
                            </td>
                          </tr>
                        )
                      }) : (
                        <tr><td colSpan={7} style={{padding: '20px', textAlign: 'center'}}>No coverage data available.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )
        })()}

        {/* References (copied) */}
        {activeSelectedSection === 'References' && (
          <section ref={referencesRef}>
            <div className={styles.refContainer}>
              <div className={styles.refHeaderBar}>
                <select value={viewType} onChange={(e) => setViewType(e.target.value)} className={styles.refSelect}>
                  <option value="Textbook">TEXTBOOKS</option>
                  <option value="Open Educational Resources">OPEN EDUCATIONAL RESOURCES</option>
                  <option value="Online Resources">ONLINE RESOURCES</option>
                </select>
                <div className={styles.refArrow}>▼</div>
              </div>

              <div className={styles.refScrollWrapper}>
                {viewType === 'Textbook' && (
                  <table className={styles.refTable}>
                    <thead>
                      <tr>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.link }}>ISBN</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getData('Textbook').length > 0 ? getData('Textbook').map((ref, i) => (
                        <tr key={i}>
                          <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>TB{i + 1}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>{ref.isbn || '-'}</td>
                          <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>{ref.year}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className={styles.refEmpty}>No Textbooks found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {viewType === 'Open Educational Resources' && (
                  <table className={styles.refTable}>
                    <thead>
                      <tr>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getData('Open Educational Resources').length > 0 ? getData('Open Educational Resources').map((ref, i) => (
                        <tr key={i}>
                          <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>OE{i + 1}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>
                            <a href={ref.link} target="_blank" rel="noreferrer">{ref.link}</a>
                          </td>
                          <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>{ref.year}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className={styles.refEmpty}>No OER found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                {viewType === 'Online Resources' && (
                  <table className={styles.refTable}>
                    <thead>
                      <tr>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.id }}>ID</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.title }}>TITLE</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.author }}>AUTHOR/S</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.link }}>LINK</th>
                        <th className={styles.refHeaderCell} style={{ width: colWidths.year }}>PUBLICATION YEAR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getData('Online Resources').length > 0 ? getData('Online Resources').map((ref, i) => (
                        <tr key={i}>
                          <td className={styles.refDataCellCenter} style={{ width: colWidths.id }}>OR{i + 1}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.title }}>{ref.title}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.author }}>{ref.authors}</td>
                          <td className={styles.refDataCellLeft} style={{ width: colWidths.link }}>
                            <a href={ref.link} target="_blank" rel="noreferrer">{ref.link}</a>
                          </td>
                          <td className={styles.refDataCellCenter} style={{ width: colWidths.year }}>{ref.year}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className={styles.refEmpty}>No Online Resources found.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Criteria for Grading (copied) */}
        {activeSelectedSection === 'Criteria for Grading' && (() => {
          const gradingSystem = syllabus?.gradingSystem || []

          const calculateTotalLocal = (period) => {
            let total = 0
            gradingSystem.forEach(group => {
              if (group.ilos) {
                group.ilos.forEach(ilo => { total += Number(ilo.weight?.[period] || 0) })
              }
            })
            return total
          }

          return (
            <section ref={criteriaRef}>
              <div className={styles.criteriaContainer}>
                <div className={styles.tableScrollWrapper}>
                  <table className={styles.criteriaTable}>
                    <thead>
                      <tr>
                        <th rowSpan="2" className={styles.headerCell} style={{ width: '100px' }}>COURSE OUTCOME</th>
                        <th rowSpan="2" className={styles.headerCell} style={{ width: '80px' }}>ILO #</th>
                        <th rowSpan="2" className={styles.headerCell}>ASSESSMENTS</th>
                        <th colSpan="4" className={styles.headerCell}>WEIGHT %</th>
                        <th rowSpan="2" className={styles.headerCell}>MIN PASSING %</th>
                      </tr>
                      <tr className={styles.subHeaderRow}>
                        <th className={styles.subHeader}>Prelim</th>
                        <th className={styles.subHeader}>Midterm</th>
                        <th className={styles.subHeader}>Semi</th>
                        <th className={styles.subHeader}>Final</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradingSystem.length > 0 && (
                        gradingSystem.map((group) => (
                          <React.Fragment key={group.co}>
                            {group.ilos.map((ilo, index) => (
                              <tr key={`${group.co}-${ilo.id}`}>
                                {index === 0 && (
                                  <td rowSpan={group.ilos.length} className={styles.coCell}><strong>{group.co}</strong></td>
                                )}
                                <td className={styles.dataCellCenter}><span style={{ fontWeight: '500' }}>{ilo.id}</span></td>
                                <td className={styles.dataCellCenter}>{Array.isArray(ilo.assessments) ? ilo.assessments.join(', ') : ilo.assessments}</td>
                                <td className={styles.dataCellCenter}>{ilo.weight?.prelim || ''}</td>
                                <td className={styles.dataCellCenter}>{ilo.weight?.midterm || ''}</td>
                                <td className={styles.dataCellCenter}>{ilo.weight?.semi || ''}</td>
                                <td className={styles.dataCellCenter}>{ilo.weight?.final || ''}</td>
                                <td className={styles.dataCellCenter}>{ilo.minPassing}</td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))
                      )}
                      {gradingSystem.length === 0 && (
                        <tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>No grading criteria available.</td></tr>
                      )}
                      <tr className={styles.totalRow}>
                        <td colSpan="3" className={styles.totalLabel}>TOTAL</td>
                        <td className={styles.dataCellCenter}>{calculateTotalLocal('prelim')}%</td>
                        <td className={styles.dataCellCenter}>{calculateTotalLocal('midterm')}%</td>
                        <td className={styles.dataCellCenter}>{calculateTotalLocal('semi')}%</td>
                        <td className={styles.dataCellCenter}>{calculateTotalLocal('final')}%</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )
        })()}

        {/* Approval comment box (preserved) */}
        <ApprovalCommentBox
          show={showCommentModal}
          onClose={closeComment}
          onSubmit={handleSubmitComment}
          courseOutcomes={courseOutcomes}
          ilos={sampleILOs}
          approverRole={currentRole}
        />
      </div>
    </div>
  )
}

export default ApprovalSyllabusSections