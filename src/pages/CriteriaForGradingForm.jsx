import { useState } from "react";
import DropdownMultiSelect from "../components/DropdownMultiSelect.jsx";
import { getSyllabusByCode } from "../data/syllabiData.js";
import styles from "../styles/CriteriaForGradingForm.module.sass";

const CriteriaForGradingForm = ({ syllabusCode }) => {
    const syllabus = getSyllabusByCode(syllabusCode);

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

    const assessmentOptions = syllabus.assessments.map(
        (a) => a.tlaName
    );

    const createRows = () => {
        let rows = [];
        courseOutcomes.forEach((co) => {
            for (let i = 0; i < ilosPerCO; i++) {
                rows.push({
                    id: `${co.id}-ILO${i + 1}`,
                    co: co.id,
                    ilo: `ILO${i + 1}`,
                    assessments: [],
                    weight: {
                        prelim: "",
                        midterm: "",
                        semi: "",
                        final: "",
                    },
                    minPassing: "",
                });
            }
        });
        return rows;
    };

    const [rows, setRows] = useState(createRows());

    const handleAssessmentChange = (rowId, selected) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId ? { ...r, assessments: selected } : r
            )
        );
    };

    const handleWeightChange = (rowId, field, value) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId
                    ? { ...r, weight: { ...r.weight, [field]: value } }
                    : r
            )
        );
    };

    const handleMinPassingChange = (rowId, value) => {
        setRows((prev) =>
            prev.map((r) =>
                r.id === rowId ? { ...r, minPassing: value } : r
            )
        );
    };

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
                                        options={assessmentOptions}
                                        initialValue={row.assessments}
                                        onChange={(selected) =>
                                            handleAssessmentChange(row.id, selected)
                                        }
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
                                        onChange={(e) =>
                                            handleMinPassingChange(
                                                row.id,
                                                e.target.value
                                            )
                                        }
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
