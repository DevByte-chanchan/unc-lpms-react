import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DropdownMultiSelect from "../components/DropdownMultiSelect.jsx";
import { getSyllabusByCode } from "../data/syllabiData.js";
import { fetchJson } from "../utils/api.js";
import styles from "../styles/CriteriaForGradingForm.module.sass";

const CriteriaForGradingForm = ({ syllabusCode, offeringID: propOfferingID, revisionNum: propRevisionNum }) => {
    const params = useParams();
    const offeringID = propOfferingID || params.pcId;
    const revisionNum = propRevisionNum || params.revNum;
    const syllabus = syllabusCode ? getSyllabusByCode(syllabusCode) : null;

    const courseOutcomes = [
        { id: "CO1" },
        { id: "CO2" },
        { id: "CO3" },
        { id: "CO4" },
    ];

    const ilosPerCO = 3;

    const weightEnabled = {
        CO1: "prelim",
        CO2: "midterm",
        CO3: "semi",
        CO4: "final",
    };

    const ILO_WEIGHTS = [20, 30, 50];

    const createRows = () => {
        const rows = [];
        courseOutcomes.forEach((co) => {
            for (let i = 0; i < ilosPerCO; i++) {
                rows.push({
                    id: `${co.id}-ILO${i + 1}`,
                    dbId: null,
                    co: co.id,
                    ilo: `ILO${i + 1}`,
                    iloIndex: i,
                    assessments: [],
                    weight: {
                        prelim: "",
                        midterm: "",
                        semi: "",
                        final: "",
                    },
                    minPassing: 60,
                });
            }
        });
        return rows;
    };

    const [rows, setRows] = useState(createRows());

    const getCOByTlaName = (syl, tlaName) => {
        if (!syl || !Array.isArray(syl.topics)) return null;
        for (const topic of syl.topics) {
            const found = topic.tlas?.find(t => t.tlaName === tlaName);
            if (found) {
                const ilo = syl.ilos?.find(i => Array.isArray(i.topics) && i.topics.includes(topic.title));
                if (!ilo) return null;
                return ilo.id.split("-")[0]; // "CO1"
            }
        }
        return null;
    };

    const coAssessmentChoices = useMemo(() => {
        const map = {
            CO1: new Set(),
            CO2: new Set(),
            CO3: new Set(),
            CO4: new Set(),
        };

        if (syllabus?.coAssessmentMethodSets) {
            Object.entries(syllabus.coAssessmentMethodSets).forEach(([co, list]) => {
                if (map[co] && Array.isArray(list)) {
                    list.forEach(m => map[co].add(m.value));
                }
            });
        }

        if (Array.isArray(syllabus?.assessments)) {
            syllabus.assessments.forEach(a => {
                const co = getCOByTlaName(syllabus, a.tlaName);
                if (co && map[co] && a.assessmentMethod) {
                    map[co].add(a.assessmentMethod);
                }
            });
        }

        rows.forEach(r => {
            if (map[r.co] && Array.isArray(r.assessments)) {
                r.assessments.forEach(a => {
                    if (a) map[r.co].add(a);
                });
            }
        });

        return {
            CO1: [...map.CO1],
            CO2: [...map.CO2],
            CO3: [...map.CO3],
            CO4: [...map.CO4],
        };
    }, [syllabus, rows]);

    const distributeAssessments = (choices, iloCount = 3) => {
        if (!choices.length) return Array.from({ length: iloCount }, () => []);

        const result = Array.from({ length: iloCount }, () => []);
        const base = Math.floor(choices.length / iloCount);
        const remainder = choices.length % iloCount;

        let index = 0;

        for (let i = 0; i < iloCount; i++) {
            const take = base + (i < remainder ? 1 : 0);
            result[i] = choices.slice(index, index + take);
            index += take;
        }

        return result;
    };

    // Fetch Criteria for Grading from API when offeringID and revisionNum are available
    useEffect(() => {
        if (!offeringID || !revisionNum) return;
        let mounted = true;

        async function loadFromApi() {
            try {
                const data = await fetchJson(`/api/course-criteria/${offeringID}/${revisionNum}`);
                if (!mounted || !Array.isArray(data?.gradingSystem)) return;

                const apiRows = [];
                data.gradingSystem.forEach((group) => {
                    (group.ilos || []).forEach((iloObj, idx) => {
                        const rawAssessments = Array.isArray(iloObj.assessments)
                            ? iloObj.assessments
                            : (iloObj.assessments ? [iloObj.assessments] : []);

                        apiRows.push({
                            id: `${group.co}-${iloObj.id || `ILO${idx + 1}`}`,
                            dbId: iloObj.dbId || null,
                            co: group.co,
                            ilo: iloObj.id || `ILO${idx + 1}`,
                            iloIndex: idx,
                            assessments: rawAssessments,
                            weight: {
                                prelim: iloObj.weight?.prelim ?? "",
                                midterm: iloObj.weight?.midterm ?? "",
                                semi: iloObj.weight?.semi ?? "",
                                final: iloObj.weight?.final ?? "",
                            },
                            minPassing: iloObj.minPassing ?? 60,
                        });
                    });
                });

                if (apiRows.length > 0) {
                    setRows(apiRows);
                }
            } catch (err) {
                console.error("Failed to fetch criteria for grading:", err);
            }
        }

        loadFromApi();
        return () => { mounted = false; };
    }, [offeringID, revisionNum]);

    useEffect(() => {
        if (offeringID && revisionNum) return;
        if (!syllabus) return;

        setRows(prev => {
            const rowsByCO = {};

            prev.forEach(row => {
                if (!rowsByCO[row.co]) rowsByCO[row.co] = [];
                rowsByCO[row.co].push(row);
            });

            return prev.map(row => {
                if (row.assessments.length > 0) return row;

                const coRows = rowsByCO[row.co];
                const choices = coAssessmentChoices[row.co] || [];
                const distributed = distributeAssessments(choices, ilosPerCO);
                const iloIndex = coRows.findIndex(r => r.id === row.id);

                return {
                    ...row,
                    assessments: distributed[iloIndex] || [],
                    minPassing: 60
                };
            });
        });
    }, [syllabus, offeringID, revisionNum]);

    useEffect(() => {
        if (offeringID && revisionNum) return;

        setRows(prev =>
            prev.map(row => {
                const enabled = weightEnabled[row.co];
                if (!enabled) return row;

                return {
                    ...row,
                    weight: {
                        ...row.weight,
                        [enabled]: ILO_WEIGHTS[row.iloIndex]
                    }
                };
            })
        );
    }, [offeringID, revisionNum]);

    const handleAssessmentChange = (rowId, selected) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId ? { ...r, assessments: selected } : r
            )
        );
    };

    const handleWeightChange = (rowId, field, rawValue) => {
        if (rawValue === "") {
            setRows(prev =>
                prev.map(r =>
                    r.id === rowId
                        ? { ...r, weight: { ...r.weight, [field]: "" } }
                        : r
                )
            );
            return;
        }

        let value = Number(rawValue);

        if (value > 100) value = 100;
        if (value < 0) value = 0;

        setRows(prev =>
            prev.map(r =>
                r.id === rowId
                    ? { ...r, weight: { ...r.weight, [field]: value } }
                    : r
            )
        );
    };

    const handleMinPassingChange = (rowId, rawValue) => {
        if (rawValue === "") {
            setRows(prev =>
                prev.map(r =>
                    r.id === rowId ? { ...r, minPassing: "" } : r
                )
            );
            return;
        }

        let value = Number(rawValue);

        if (value > 100) value = 100;
        if (value < 0) value = 0;

        setRows(prev =>
            prev.map(r =>
                r.id === rowId ? { ...r, minPassing: value } : r
            )
        );
    };

    const buildGradingSystem = (currentRows) => {
        const grouped = {};

        currentRows.forEach(r => {
            if (!grouped[r.co]) {
                grouped[r.co] = {
                    co: r.co,
                    ilos: []
                };
            }

            grouped[r.co].ilos.push({
                id: r.ilo,
                dbId: r.dbId || null,
                assessments: r.assessments,
                weight: r.weight,
                minPassing: r.minPassing
            });
        });

        return Object.values(grouped);
    };

    useEffect(() => {
        if (!syllabus) return;
        const gradingSystem = buildGradingSystem(rows);
        syllabus.gradingSystem = gradingSystem;
    }, [rows, syllabus]);

    return (
        <div className={styles.container}>
            <h2>Criteria For Grading</h2>

            <table className={`${styles.table} ${styles.criteriaTable}`}>
                <thead>
                <tr>
                    <th>COURSE OUTCOME</th>
                    <th className={styles.headerCell}>ILOs</th>
                    <th className={styles.headerCell}>ASSESSMENTS</th>
                    <th>
                        <div className={styles.weightHeader}>
                            WEIGHT %
                            <div className={styles.subheaders}>
                                <span>Prelim</span>
                                <span>Midterm</span>
                                <span>Semi</span>
                                <span>Final</span>
                            </div>
                        </div>
                    </th>
                    <th>MINIMUM PASSING %</th>
                </tr>
                </thead>

                <tbody>
                {rows.map((row) => {
                    const enabledWeight = weightEnabled[row.co];
                    const optionsForThisRow = coAssessmentChoices[row.co] || [];

                    return (
                        <tr key={row.id}>
                            <td>
                                <div className={`${styles.cellBox} ${styles.muted}`}>
                                    {row.co}
                                </div>
                            </td>

                            <td>
                                <div className={`${styles.cellBox} ${styles.muted}`}>
                                    {row.ilo}
                                </div>
                            </td>

                            <td>
                                <div className={`${styles.cellBox} ${styles.noPad}`}>
                                    <DropdownMultiSelect
                                        options={optionsForThisRow}
                                        value={row.assessments}
                                        onChange={(selected) => handleAssessmentChange(row.id, selected)}
                                    />
                                </div>
                            </td>

                            <td>
                                <div className={styles.weightCell}>
                                    {["prelim", "midterm", "semi", "final"].map(
                                        (w) => (
                                            <div key={w} className={styles.weightBox}>
                                                <input
                                                    type="number"
                                                    value={row.weight[w]}
                                                    disabled={enabledWeight !== w}
                                                    onChange={(e) =>
                                                        handleWeightChange(
                                                            row.id,
                                                            w,
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </div>
                                        )
                                    )}
                                </div>
                            </td>

                            <td>
                                <div className={`${styles.cellBox} ${styles.minPassing}`}>
                                    <input
                                        type="number"
                                        value={row.minPassing}
                                        onChange={e => handleMinPassingChange(row.id, e.target.value)}
                                    />
                                </div>
                            </td>
                        </tr>
                    );
                })}

                <tr className={styles.totalRow}>
                    <td>
                        <div className={styles.totalLabel}>Total</div>
                    </td>
                    <td></td>
                    <td></td>
                    <td>
                        <div className={styles.weightCell}>
                            {["prelim", "midterm", "semi", "final"].map((w) => (
                                <div key={w} className={styles.weightBox}>
                                    <input
                                        type="number"
                                        disabled
                                        value={rows.reduce(
                                            (sum, r) => sum + Number(r.weight[w] || 0),
                                            0
                                        )}
                                    />
                                </div>
                            ))}
                        </div>
                    </td>

                    <td />
                </tr>
                </tbody>
            </table>
        </div>
    );
};

export default CriteriaForGradingForm;
