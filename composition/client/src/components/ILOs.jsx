import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Inbox } from "react-feather";


const AssignScheduleModal = ({ isOpen, onClose, onSave, iloId, currentWeeks, currentHours, styles }) => {
    // Use ?? instead of || so that if the value is 0, it doesn't default to ''
    const [weeks, setWeeks] = useState(currentWeeks ?? '');
    console.log("weeks:" + weeks)
    const [hours, setHours] = useState(currentHours ?? '');
    console.log("hours:" + hours)


    // Re-initialize state whenever the modal opens or the props change
    useEffect(() => {
        if (isOpen) {
            setWeeks(currentWeeks ?? '');
            setHours(currentHours ?? '');
        }
    }, [isOpen, currentWeeks, currentHours]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(iloId, {
            weeks: parseFloat(weeks) || null,
            hours: parseInt(hours, 10) || null
        });
    };

    return (
        <div className={styles.scheduleOverlay}>
            <div className={styles.scheduleModal}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>Time Allocation</h3>
                    <button type="button" className={styles.closeBtn} onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className={styles.formBody}>
                    <div className={styles.inputGroup}>
                        {/* Updated Formal Label */}
                        <label>Allocated Weeks</label>
                        <div className={styles.selectWrapper}>
                            <select value={Math.trunc(weeks)} onChange={(e) => setWeeks(e.target.value)} required>
                                <option value="" disabled>Select weeks</option>
                                {[1, 2, 3].map(w => (
                                    <option key={`week-${w}`} value={w}>
                                        {w} week{w > 1 ? 's' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        {/* Updated Formal Label */}
                        <label>Contact Hours</label>
                        <div className={styles.selectWrapper}>
                            <select value={hours} onChange={(e) => setHours(e.target.value)} required>
                                <option value="" disabled>Select hours</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(h => (
                                    <option key={`hour-${h}`} value={h}>
                                        {h} hour{h > 1 ? 's' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.actionRow}>
                        <button type="submit" className={styles.saveBtn}>Apply</button>
                    </div>
                </form>
            </div>
        </div>
    );
};



const ILOs = ({ offeringID, revisionNum, status, styles, fetchJson }) => {
    const [iloData, setIloData] = useState({ course: null, courseOutcomes: [], ilos: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [commentCounts, setCommentCounts] = useState({});

    // Modal state for Assign Schedule
    const [activeScheduleIloId, setActiveScheduleIloId] = useState(null);
    console.log(activeScheduleIloId)



    // 1. Fetch main ILO Data layer
    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function fetchILOs() {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchJson(`/api/ilos/${offeringID}/${revisionNum}`);

                if (!mounted) return;
                const flatILOs = [];
                for (const co of data.courseOutcomes) {
                    co.ilos.sort((a, b) => a.id - b.id);
                    co.ilos.forEach(ilo => flatILOs.push({ ...ilo, co_id: co.co_id }));
                }
                setIloData({ course: data.course, courseOutcomes: data.courseOutcomes, ilos: flatILOs });
            } catch (err) {
                console.error(err);
                if (!mounted) return;
                setError(err.message);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchILOs();
        return () => { mounted = false; };
    }, [offeringID, revisionNum, fetchJson]);

    // 2. Dynamic Badge Counter: Triggers only when flat list of ILOs is ready
    useEffect(() => {
        if (status !== 'returned' || !iloData.ilos || iloData.ilos.length === 0) return;
        let mounted = true;

        async function gatherAllCommentCounts() {
            const targetTypes = ['references', 'topics', 'tlas'];
            const localCountsMap = {};

            try {
                const fetchPromises = [];

                iloData.ilos.forEach(ilo => {
                    targetTypes.forEach(type => {
                        const promise = fetchJson(`/api/comments/filter/${ilo.id}/${type}`)
                            .then(comments => {
                                if (!mounted) return;
                                const unresolvedCount = comments.filter(c => !c.resolved_status).length;
                                if (unresolvedCount > 0) {
                                    localCountsMap[`${ilo.id}_${type}`] = unresolvedCount;
                                }
                            })
                            .catch(err => console.error(`Failed to fetch comments for ILO ${ilo.id} type ${type}:`, err));

                        fetchPromises.push(promise);
                    });
                });

                await Promise.all(fetchPromises);

                if (mounted) {
                    setCommentCounts(localCountsMap);
                }
            } catch (error) {
                console.error("Error batching comment layout parameters:", error);
            }
        }

        gatherAllCommentCounts();
        return () => { mounted = false; };
    }, [iloData.ilos, status, fetchJson]);

    const getBadgeCount = (iloId, type) => {
        return commentCounts[`${iloId}_${type}`] || 0;
    };

    const handleSaveSchedule = async (iloId, scheduleData) => {
        try {
            const response = await fetchJson(`/api/ilos/${iloId}/schedule`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleData)
            });

            // 1. Update local state so the table data updates immediately without refreshing
            setIloData(prevData => ({
                ...prevData,
                ilos: prevData.ilos.map(ilo =>
                    ilo.id === iloId
                        ? { ...ilo, weeks: scheduleData.weeks, hours: scheduleData.hours }
                        : ilo
                )
            }));

            // 2. Close the modal on success
            setActiveScheduleIloId(null);
            console.log("Schedule saved successfully!", response);

        } catch (error) {
            // 3. Catch the 400 Bad Request and alert the user if they exceed limits
            let errorMsg = error.message;
            try {
                const jsonStart = error.message.indexOf('{');
                if (jsonStart !== -1) {
                    const parsed = JSON.parse(error.message.substring(jsonStart));
                    errorMsg = parsed.message || errorMsg;
                }
            } catch (e) {
                // Fallback to standard error
            }

            alert(`Cannot save schedule: ${errorMsg}`);
            console.error("Save failed:", error);
        }
    };
    if (loading) {
        return <div className={styles.loadingContainer}>Loading ILOs...</div>;
    }

    if (error) {
        return <div className={styles.errorContainer}>Error: {error}</div>;
    }

    // Grab the active ILO object to pass its current weeks/hours down to the modal
    const activeIlo = iloData.ilos.find(ilo => ilo.id === activeScheduleIloId);
    console.log(activeIlo?.weeks)
    console.log(activeIlo?.hours)

    return (
        <section>
            <div className={styles['ilo-container']}>
                <table>
                    <thead>
                    <tr>
                        <th width={150}>CO-ILO #</th>
                        <th width={600}>Description</th>
                        <th className={styles.fill} width={250}></th>
                    </tr>
                    </thead>
                    <tbody>
                    {iloData.ilos && iloData.ilos.length > 0 ? (() => {
                        let coDisplaySequence = 0;
                        let lastCoId = null;
                        let iloDisplaySequence = 0;
                        let coItemIndex = 0; // Tracks the element's position within its current CO group

                        return iloData.ilos.map((ilo) => {
                            // 1. Reset or increment the inner position index when crossing CO boundaries
                            if (ilo.co_id !== lastCoId) {
                                lastCoId = ilo.co_id;
                                coDisplaySequence++;
                                coItemIndex = 0;
                            } else {
                                coItemIndex++;
                            }

                            // 2. Count the total number of ILOs assigned to this specific CO
                            const totalIlosInCo = iloData.ilos.filter(i => i.co_id === ilo.co_id).length;

                            // 3. Condition: If there are exactly 4 ILOs in this CO, automatically flag the 1st one (index 0)
                            const isCourseOrientation = (totalIlosInCo === 4 && coItemIndex === 0);

                            // 4. Handle sequential numbering based on the flag
                            if (coItemIndex === 0) {
                                iloDisplaySequence = isCourseOrientation ? 0 : 1;
                            } else {
                                if (!isCourseOrientation) {
                                    iloDisplaySequence++;
                                }
                            }

                            // 5. Build standard label or clear it if it's the Course Orientation item
                            const entryLabel = isCourseOrientation ? "" : `CO${coDisplaySequence}-ILO${iloDisplaySequence}`;

                            const refBadges = getBadgeCount(ilo.id, 'references');
                            const topicBadges = getBadgeCount(ilo.id, 'topics');
                            const tlaBadges = getBadgeCount(ilo.id, 'tlas');

                            return (
                                <tr key={ilo.id}>
                                    <td width={150} style={{ fontWeight: 500 }}>
                                        {entryLabel}
                                        {/* Optional: Show currently assigned weeks/hours under the label if they exist */}
                                        {/*{(ilo.weeks || ilo.hours) && (*/}
                                        {/*    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>*/}
                                        {/*        {ilo.weeks && `${ilo.weeks} Wk `}*/}
                                        {/*        {ilo.hours && `${ilo.hours} Hr`}*/}
                                        {/*    </div>*/}
                                        {/*)}*/}
                                    </td>
                                    <td width={600}>{ilo.description}</td>
                                    <td className={styles.fill} width={250} style={{ display: "flex", flexDirection: "column", alignItems: "end", gap: 5 }}>



                                        {/* Assign Topics */}
                                        <Link className="actionLink" to={`/topics/form/${ilo.id}/${status}`}>
                                                <span className={styles['link-text-wrapper']}>
                                                    Assign Topics
                                                    <ChevronRight size={18} />
                                                    <div className={styles.fixedWidth}>
                                                        {status === 'returned' && topicBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{topicBadges}</span>
                                                        )}
                                                    </div>
                                                </span>
                                        </Link>

                                        {/* Assign Week and Time Button (Trigger) */}
                                        <button
                                            className={`${styles.actionLink} ${styles.schedSetter}`}
                                            onClick={() => setActiveScheduleIloId(ilo.id)}
                                        >
                                            <span className={styles['link-text-wrapper']}>
                                                Set Weeks & Hours
                                                <ChevronRight size={18} />
                                                <div className={styles.fixedWidth}></div>
                                            </span>
                                        </button>

                                        {/* Assign TLAs */}
                                        <Link className="actionLink" to={`/tlas/form/${ilo.id}/${status}`}>
                                                <span className={styles['link-text-wrapper']}>
                                                    Assign TLAs
                                                    <ChevronRight size={18} />
                                                    <div className={styles.fixedWidth}>
                                                        {status === 'returned' && tlaBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{tlaBadges}</span>
                                                        )}
                                                    </div>
                                                </span>
                                        </Link>

                                        {/* Assign References */}
                                        <Link className="actionLink" to={`/references/form/${ilo.id}/${status}`}>
                                                <span className={styles['link-text-wrapper']}>
                                                    Assign References
                                                    <ChevronRight size={18} />
                                                    <div className={styles.fixedWidth}>
                                                        {status === 'returned' && refBadges > 0 && (
                                                            <span className={styles['comment-badge']}>{refBadges}</span>
                                                        )}
                                                    </div>
                                                </span>
                                        </Link>





                                    </td>
                                </tr>
                            );
                        });
                    })() : (
                        <tr className={styles.emptyRow}>
                            <td colSpan={3}>
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

            {/* Mount the modal when activeScheduleIloId is set */}
            {activeScheduleIloId && (
                <AssignScheduleModal
                    isOpen={!!activeScheduleIloId}
                    onClose={() => setActiveScheduleIloId(null)}
                    onSave={handleSaveSchedule}
                    iloId={activeScheduleIloId}
                    currentWeeks={activeIlo?.weeks}
                    currentHours={activeIlo?.hours}
                    styles={styles}
                />
            )}
        </section>
    );
};

export default ILOs;