import React from "react";
import layout from "../styles/TOSPreview.module.sass";
import { useNavigate } from "react-router-dom";

const TOSPreview = ({ isOpen, onClose, outcomeData, questions, courseName = "Human & Computer Interaction", semester = "1st Sem", schoolYear = "2024 - 2025" }) => {
    if (!isOpen) return null;

    const navigate = useNavigate();

    const cognitiveLevels = [
        'Remembering',
        'Understanding',
        'Applying',
        'Analyzing',
        'Evaluating',
        'Creating'
    ];

    // Aggregate cognitive data (counts and sums per CO-ILO-level)
    const getAggregatedData = () => {
        const data = {};
        outcomeData.forEach(co => {
            data[co.co] = {};
            co.ilos.forEach(ilo => {
                data[co.co][ilo.id] = {};
                cognitiveLevels.forEach(level => {
                    data[co.co][ilo.id][level] = { count: 0, sumPoints: 0 };
                });
            });
        });

        questions.forEach(q => {
            if (q.co && q.ilo && q.cognitiveLevel && q.points) {
                data[q.co][q.ilo][q.cognitiveLevel].count += 1;
                data[q.co][q.ilo][q.cognitiveLevel].sumPoints += Number(q.points);
            }
        });

        return data;
    };

    const aggregatedData = getAggregatedData();
    const totalHours = outcomeData.reduce((sum, co) => sum + (co.totalHours || 0), 0);
    const totalPercentage = outcomeData.reduce((sum, co) => sum + (co.totalPercentage || 0), 0);
    const totalItems = outcomeData.reduce((sum, co) => sum + (co.totalItems || 0), 0);

    const totalCognitive = cognitiveLevels.map(level => {
        return outcomeData.reduce((sum, co) => {
            return sum + co.ilos.reduce((iloSum, ilo) => iloSum + (aggregatedData[co.co][ilo.id][level].sumPoints || 0), 0);
        }, 0);
    });

    return (
        <div className={layout.modalOverlay}>
            <div className={layout.modalContent}>
                <button className={layout.closeButton} onClick={onClose}>×</button>
                <h2 className={layout.previewTitle}>TOS Document Preview</h2>

                <div className={layout.headerFields}>
                    <div className={layout.topRow}>
                        <label>Course:</label>
                        <input
                            type="text"
                            disabled
                            value={courseName}
                            className={layout.numberInput}
                        />
                        <label>Exam:</label>
                        <input
                            type="text"
                            disabled
                            value="Midterm"
                            className={layout.numberInput}
                        />
                    </div>
                    <div className={layout.bottomRow}>
                        <label>Semester:</label>
                        <input
                            type="text"
                            disabled
                            value={semester}
                            className={layout.numberInput}
                        />
                        <label>School Year:</label>
                        <input
                            type="text"
                            disabled
                            value={schoolYear}
                            className={layout.numberInput}
                        />
                    </div>
                </div>
                {/* Table */}
                <table className={`${layout.qctable} ${layout.TOSTable}`} style={{ width: '100%', marginBottom: '20px' }}>
                    <thead>
                    <tr>
                        <th>COs & ILOs</th>
                        <th>No. of Hours</th>
                        <th>%</th>
                        <th>No. of Items</th>
                        <th style={{justifyContent: "center", width: "800px"}}>
                            Cognitive Levels
                        </th>
                    </tr>
                    <tr className={layout['sub-column']}>
                        <th></th>
                        <th></th>
                        <th></th>
                        <th></th>
                        {cognitiveLevels.map(level => (
                            <th key={level} className={layout.lighten}>{level}</th>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {outcomeData.map(co => (
                        <React.Fragment key={co.co}>
                            {/* CO Row */}
                            <tr style={{background: "#F9FAFB", height: '50px'}}>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px', fontWeight: "bold"}}>{co.co}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px'}}>{co.totalHours || 0}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px'}}>{co.totalPercentage || 0}</div>
                                </td>
                                <td>
                                    <div className={layout.cellBox} style={{fontSize: '16px'}}>{co.totalItems || 0}</div>
                                </td>
                                {cognitiveLevels.map(level => (
                                    <td key={level}>
                                    </td>
                                ))}
                            </tr>
                            {/* ILO Rows */}
                            {co.ilos.map(ilo => (
                                <tr key={ilo.id}>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.id}</div>
                                    </td>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.hours || 0}</div>
                                    </td>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.percentage || 0}</div>
                                    </td>
                                    <td>
                                        <div className={layout.cellBox}>{ilo.items || 0}</div>
                                    </td>
                                    {cognitiveLevels.map(level => (
                                        <td key={level}>
                                            <div className={layout.cellBox}>
                                                {aggregatedData[co.co][ilo.id][level].count > 0
                                                    ? `${aggregatedData[co.co][ilo.id][level].count} x ${aggregatedData[co.co][ilo.id][level].sumPoints}`
                                                    : ''
                                                }
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                    {/* Total Row */}
                    <tr style={{background: "#F9FAFB", height: '50px', fontWeight: '500'}} >
                        <td>
                            <div className={layout.cellBox}>Total</div>
                        </td>
                        <td>
                            <div className={layout.cellBox}>{totalHours}</div>
                        </td>
                        <td>
                            <div className={layout.cellBox}>{totalPercentage}</div>
                        </td>
                        <td>
                            <div className={layout.cellBox}>{totalItems}</div>
                        </td>
                        {totalCognitive.map((total, index) => (
                            <td key={index}>
                                <div className={layout.cellBox}>{total}</div>
                            </td>
                        ))}
                    </tr>
                    </tbody>
                </table>
                <div className={layout.exportButtonContainer}>
                    <button
                        className={layout.export}
                        onClick={() => navigate("/assignedtos")}
                    >
                        Export TOS
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TOSPreview;