import React, { useState, useEffect } from 'react';
import { WEEK_COMMENTS_EVENT } from '../utils/useCommentFocus.js'
import { offeringKey } from '../utils/offeringKey.js'
import HeadBodyTable from './HeadBodyTable.jsx';
import { AlertTriangle } from 'react-feather';
import EmptyState from './EmptyState.jsx';
import { describeCourseLoadError } from '../utils/courseLoadError.js';

const TlaGroup = ({ title, tlas, stylesB }) => {
    if (!tlas || tlas.length === 0) return null;
    return (
        <div className={stylesB.tlaGroupBlock}>
            <div className={stylesB.tlaPhaseHeader}>{title}</div>
            {tlas.map(tla => (
                <div key={tla.id} className={stylesB.tlaItem} data-target-kind="TLA" data-target={tla.tlaName}>
                    <div className={stylesB.tlaNameLine}>
                        <span className={stylesB.perfTag}>
                            {tla.performedBy === 'Instructor' ? '[I]' : '[S]'}
                        </span>
                        <span className={stylesB.boldText}> {tla.tlaName}</span>
                        {tla.laboratory && <span className={stylesB.labTag}> (Lab)</span>}
                    </div>
                    <div className={stylesB.descText}>{tla.tlaDescription}</div>
                </div>
            ))}
        </div>
    );
};

const CourseCoverage = ({ offeringID, revisionNum, status, selectedSection, styles, stylesB, fetchJson }) => {
    const [coverageData, setCoverageData] = useState({
        orientation: null,
        courseOutcomes: [],
        topics: [],
        assessments: []
    });
    const [isMatrixLoading, setIsMatrixLoading] = useState(true);
    const [coverageCommentCounts, setCoverageCommentCounts] = useState({});
    const [coverageError, setCoverageError] = useState('');

    // 1. Fetch live coverage database records
    useEffect(() => {
        if (!offeringID || selectedSection !== 'Course Coverage') return;
        let mounted = true;

        async function fetchLiveCoverageMatrix() {
            try {
                setIsMatrixLoading(true);
                setCoverageError('');
                const data = await fetchJson(`/api/course-coverage/${offeringKey(offeringID, revisionNum)}`);
                if (!mounted) return;
                setCoverageData(data || { orientation: null, courseOutcomes: [], topics: [], assessments: [] });
            } catch (err) {
                console.error("Error communicating with dynamic course coverage components:", err);
                if (mounted) setCoverageError(describeCourseLoadError(err));
            } finally {
                if (mounted) setIsMatrixLoading(false);
            }
        }

        fetchLiveCoverageMatrix();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, selectedSection, fetchJson]);

    // 2. Fetch related workflow resolution badges per Week
    useEffect(() => {
        if (
            status !== 'returned' ||
            selectedSection !== 'Course Coverage' ||
            !coverageData.courseOutcomes ||
            coverageData.courseOutcomes.length === 0
        ) return;

        let mounted = true;

        async function gatherCoverageCommentCounts() {
            const localCountsMap = {};
            const commentSubGroups = ['references', 'topics', 'tlas'];
            const allWeeks = coverageData.courseOutcomes.flatMap(co => co.weeks || []);

            try {
                const fetchPromises = [];

                allWeeks.forEach(w => {
                    const targetWeekId = w.week_id;
                    if (!targetWeekId) return;

                    commentSubGroups.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${targetWeekId}/${type}`)
                            .then(comments => {
                                if (!mounted || !Array.isArray(comments)) return;

                                const unresolvedCount = comments.filter(c => {
                                    return c.resolved_status === false || c.resolved_status === 0 || String(c.resolved_status).toLowerCase() === 'false';
                                }).length;

                                if (unresolvedCount > 0) {
                                    localCountsMap[`${targetWeekId}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Coverage comment mismatch on Week ${targetWeekId}:`, err));

                        fetchPromises.push(promise);
                    });
                });

                await Promise.all(fetchPromises);
                if (mounted) setCoverageCommentCounts(localCountsMap);
            } catch (error) {
                console.error("Error parsing layout badge parameters:", error);
            }
        }

        gatherCoverageCommentCounts();
        return () => { mounted = false; };
    }, [coverageData.courseOutcomes, status, selectedSection, fetchJson]);

    if (isMatrixLoading) {
        return (
            <div className={stylesB.ccContainer}>
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '0.95rem' }}>
                    Loading Course Coverage Data Matrix...
                </div>
            </div>
        );
    }

    if (coverageError) {
        return <EmptyState icon={<AlertTriangle size={22} strokeWidth={1.6} />} title="Could not load course coverage" hint={coverageError} />;
    }

    const orientation = coverageData.orientation || null;
    const courseOutcomes = coverageData.courseOutcomes || [];

    const colWidths = {
        co: '60px',
        ilo: '220px',
        topic: '250px',
        period: '100px',
        tla: '350px',
        assess: '220px',
        ref: '100px'
    };

    const filterTLAsByPhase = (tlas, phase) => {
        if (!Array.isArray(tlas)) return [];
        return tlas.filter(t => t.classPhase && t.classPhase.toLowerCase() === phase.toLowerCase());
    };

    const getRefId = (refString) => (refString || '').split(' - ')[0];

    const getWeekUnresolvedTotal = (weekId) => {
        if (!weekId) return 0;
        const refCount = coverageCommentCounts[`${weekId}_references`] || 0;
        const topicCount = coverageCommentCounts[`${weekId}_topics`] || 0;
        const tlaCount = coverageCommentCounts[`${weekId}_tlas`] || 0;
        return refCount + topicCount + tlaCount;
    };

    const hasData = Boolean(orientation) || courseOutcomes.length > 0;

    return (
        <div className={stylesB.ccContainer}>
            {/* The header stays put while the weekly rows scroll (HeadBodyTable). */}
            <HeadBodyTable label="Course coverage" tableClass={stylesB.ccTable}
                widths={[60, 220, 250, 100, 350, 220, 100]}
                head={(
                    <tr>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.co }}>CO</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.ilo }}>ILO</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.topic }}>TOPIC</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.period }}>PERIOD</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.tla }}>TEACHING & LEARNING ACTIVITIES (TLAs)</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.assess }}>ASSESSMENT</th>
                        <th className={stylesB.ccHeader} style={{ width: colWidths.ref }}>RESOURCES</th>
                    </tr>
                )}>
                    <tbody>
                    {hasData ? (
                        <>
                            {/* 1. COURSE ORIENTATION ROW (1 Row) */}
                            {orientation && (() => {
                                const orientPreTLAs = filterTLAsByPhase(orientation.tlas, 'Pre-class');
                                const orientInTLAs = filterTLAsByPhase(orientation.tlas, 'In-class');
                                const orientPostTLAs = filterTLAsByPhase(orientation.tlas, 'Post-class');
                                const allOrientTLAs = [...orientPreTLAs, ...orientInTLAs, ...orientPostTLAs];
                                const orientAssessments = orientation.assessments || [];
                                const orientTopics = orientation.topics || [];
                                const orientRefs = orientation.references || [];

                                return (
                                    <tr key={orientation.id || 'course-orientation-row'}>
                                        {/* CO COLUMN */}
                                        <td
                                            className={`${stylesB.ccCell} ${stylesB.centerText} ${stylesB.boldText}`}
                                            style={{ width: colWidths.co }}
                                        ></td>

                                        {/* ILO COLUMN */}
                                        <td className={stylesB.ccCell} style={{ width: colWidths.ilo }}>
                                            {orientation.intendedLearningOutcome}
                                        </td>

                                        {/* TOPIC COLUMN */}
                                        <td className={stylesB.ccCell} style={{ width: colWidths.topic }}>
                                            {orientTopics.map(t => (
                                                <div key={t.id} className={stylesB.topicBlock} data-target-kind="Topic" data-target={t.title}>
                                                    <div className={stylesB.topicTitle}>{t.title}</div>
                                                    <ul className={stylesB.subtopicList}>
                                                        {t.subtopics && t.subtopics.map(sub => (
                                                            <li key={sub.id}>{sub.value}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))}
                                        </td>

                                        {/* PERIOD COLUMN */}
                                        <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.period }}>
                                            <div className={stylesB.boldText}>{orientation.deliveryWeek}</div>
                                            <div>{orientation.allocatedTime}</div>
                                        </td>

                                        {/* TEACHING & LEARNING ACTIVITIES (TLAs) COLUMN */}
                                        <td className={stylesB.ccCell} style={{ width: colWidths.tla }}>
                                            <TlaGroup title="PRE-CLASS" tlas={orientPreTLAs} stylesB={stylesB} />
                                            <TlaGroup title="IN-CLASS" tlas={orientInTLAs} stylesB={stylesB} />
                                            <TlaGroup title="POST-CLASS" tlas={orientPostTLAs} stylesB={stylesB} />
                                            {allOrientTLAs.length === 0 && <span className={stylesB.descText}>No activities listed.</span>}
                                        </td>

                                        {/* ASSESSMENT COLUMN */}
                                        <td className={stylesB.ccCell} style={{ width: colWidths.assess }}>
                                            {orientAssessments.map((assess, i) => (
                                                <div key={assess.id || i} className={stylesB.assessItem}>
                                                    <div className={stylesB.boldText}>{assess.assessmentMethod}</div>
                                                    {assess.description && (
                                                        <div className={stylesB.descText}>{assess.description}</div>
                                                    )}
                                                </div>
                                            ))}
                                            {orientAssessments.length === 0 && <span className={stylesB.descText}>No assessments listed.</span>}
                                        </td>

                                        {/* RESOURCES COLUMN */}
                                        <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.ref }}>
                                            {orientRefs.map((ref, i) => (
                                                <div key={i}>{getRefId(ref)}</div>
                                            ))}
                                        </td>
                                    </tr>
                                );
                            })()}

                            {/* 2. 4 COURSE OUTCOME BLOCKS (Tall CO cell + Tall ILO cell + Weekly Sub-Rows + Period Divider Row) */}
                            {courseOutcomes.map((co) => {
                                const coWeeks = co.weeks && co.weeks.length > 0 ? co.weeks : [{
                                    week_id: `empty-${co.co_id}`,
                                    deliveryWeek: '',
                                    allocatedTime: '',
                                    topics: [],
                                    tlas: [],
                                    assessments: [],
                                    references: []
                                }];
                                const coRowSpan = coWeeks.length;
                                const coIlos = co.ilos || [];

                                return (
                                    <React.Fragment key={`co-block-${co.co_id}`}>
                                        {coWeeks.map((week, wIdx) => {
                                            const preTLAs = filterTLAsByPhase(week.tlas, 'Pre-class');
                                            const inTLAs = filterTLAsByPhase(week.tlas, 'In-class');
                                            const postTLAs = filterTLAsByPhase(week.tlas, 'Post-class');
                                            const allWeekTLAs = [...preTLAs, ...inTLAs, ...postTLAs];
                                            const weekAssessments = week.assessments || [];
                                            const weekTopics = week.topics || [];
                                            const weekRefs = week.references || [];
                                            const totalWeekUnresolved = getWeekUnresolvedTotal(week.week_id);

                                            return (
                                                <tr key={`co-${co.co_id}-week-${week.week_id}`} data-week-id={week.week_id} data-ilo-id={`CO${co.coNumber}-W${wIdx + 1}`}>
                                                    {/* TALL 1-ROW CO COLUMN */}
                                                    {wIdx === 0 && (
                                                        <td
                                                            rowSpan={coRowSpan}
                                                            className={`${stylesB.ccCell} ${stylesB.boldText}`}
                                                            style={{ width: colWidths.co, textAlign: 'center', verticalAlign: 'top' }}
                                                        >
                                                            {co.coLabel || `CO${co.coNumber}`}
                                                        </td>
                                                    )}

                                                    {/* TALL 1-ROW ILO COLUMN (All 3 ILOs in 1 Spanned Cell) */}
                                                    {wIdx === 0 && (
                                                        <td
                                                            rowSpan={coRowSpan}
                                                            className={stylesB.ccCell}
                                                            style={{ width: colWidths.ilo }}
                                                        >
                                                            {coIlos.map((iloItem, idx) => (
                                                                <div
                                                                    key={iloItem.id || idx}
                                                                    style={{ marginBottom: idx < coIlos.length - 1 ? '16px' : '0' }}
                                                                >
                                                                    <div className={stylesB.boldText} style={{ marginBottom: '4px' }}>
                                                                        {iloItem.label || `ILO${idx + 1}`}
                                                                    </div>
                                                                    <div>{iloItem.description}</div>
                                                                </div>
                                                            ))}
                                                        </td>
                                                    )}

                                                    {/* WEEKLY SUB-ROW: TOPIC COLUMN */}
                                                    <td className={stylesB.ccCell} style={{ width: colWidths.topic }}>
                                                        {weekTopics.map(t => (
                                                            <div key={t.id} className={stylesB.topicBlock} data-target-kind="Topic" data-target={t.title}>
                                                                <div className={stylesB.topicTitle}>{t.title}</div>
                                                                <ul className={stylesB.subtopicList}>
                                                                    {t.subtopics && t.subtopics.map(sub => (
                                                                        <li key={sub.id}>{sub.value}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </td>

                                                    {/* WEEKLY SUB-ROW: PERIOD COLUMN */}
                                                    <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.period }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                            <span className={stylesB.boldText}>{week.deliveryWeek}</span>
                                                            {status === 'returned' && totalWeekUnresolved > 0 && (
                                                                // Open comments on this week: a click opens the comments panel at them (utils/useCommentFocus.js).
                                                                // A plain badge that also acts as a button (a <button> would take the app's button sizing).
                                                                <span className={styles['comment-badge']} role="button" tabIndex={0}
                                                                    style={{ cursor: 'pointer' }}
                                                                    title={`${totalWeekUnresolved} open comment${totalWeekUnresolved === 1 ? '' : 's'} on this week: show ${totalWeekUnresolved === 1 ? 'it' : 'them'}`}
                                                                    aria-label={`Show the ${totalWeekUnresolved} open comment${totalWeekUnresolved === 1 ? '' : 's'} on ${week.deliveryWeek}`}
                                                                    onClick={() => window.dispatchEvent(new CustomEvent(WEEK_COMMENTS_EVENT, { detail: { week: `CO${co.coNumber}-W${wIdx + 1}` } }))}
                                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click() } }}>
                                                                    {totalWeekUnresolved}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div>{week.allocatedTime}</div>
                                                    </td>

                                                    {/* WEEKLY SUB-ROW: TEACHING & LEARNING ACTIVITIES (TLAs) COLUMN */}
                                                    <td className={stylesB.ccCell} style={{ width: colWidths.tla }}>
                                                        <TlaGroup title="PRE-CLASS" tlas={preTLAs} stylesB={stylesB} />
                                                        <TlaGroup title="IN-CLASS" tlas={inTLAs} stylesB={stylesB} />
                                                        <TlaGroup title="POST-CLASS" tlas={postTLAs} stylesB={stylesB} />
                                                        {allWeekTLAs.length === 0 && <span className={stylesB.descText}>No activities listed.</span>}
                                                    </td>

                                                    {/* WEEKLY SUB-ROW: ASSESSMENT COLUMN */}
                                                    <td className={stylesB.ccCell} style={{ width: colWidths.assess }}>
                                                        {weekAssessments.map((assess, i) => (
                                                            <div key={assess.id || i} className={stylesB.assessItem}>
                                                                <div className={stylesB.boldText}>{assess.assessmentMethod}</div>
                                                                {assess.description && (
                                                                    <div className={stylesB.descText}>{assess.description}</div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {weekAssessments.length === 0 && <span className={stylesB.descText}>No assessments listed.</span>}
                                                    </td>

                                                    {/* WEEKLY SUB-ROW: RESOURCES COLUMN */}
                                                    <td className={`${stylesB.ccCell} ${stylesB.centerText}`} style={{ width: colWidths.ref }}>
                                                        {weekRefs.map((ref, i) => (
                                                            <div key={i}>{getRefId(ref)}</div>
                                                        ))}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {/* 3. THIN EXAMINATION PERIOD DIVIDER ROW (PRELIM, MIDTERM, SEMIFINAL, FINAL) */}
                                        {co.examDivider && (
                                            <tr key={`exam-divider-${co.examDivider.id}`}>
                                                <td colSpan={7} className={stylesB.ccDividerCell}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                        <span className={stylesB.boldText} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                            {co.examDivider.label}
                                                        </span>
                                                        {(co.examDivider.deliveryWeek || co.examDivider.allocatedTime) && (
                                                            <span className={stylesB.boldText} style={{ fontSize: '13px' }}>
                                                                {co.examDivider.deliveryWeek}
                                                                {co.examDivider.deliveryWeek && co.examDivider.allocatedTime ? ' ' : ''}
                                                                {co.examDivider.allocatedTime}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </>
                    ) : (
                        <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>No coverage data available.</td></tr>
                    )}
                    </tbody>
            </HeadBodyTable>
        </div>
    );
};

export default CourseCoverage;
