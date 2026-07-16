import React from "react";
import layout from "../styles/QuestionCognitiveMapping.module.sass";

const TOSSummary = ({ outcomeData, questions }) => {
    const cognitiveLevels = [
        'Remembering',
        'Understanding',
        'Applying',
        'Analyzing',
        'Evaluating',
        'Creating'
    ];

    const getCoComputedTotal = (coId) => {
        return questions
            .filter(q => q.co === coId && q.points)
            .reduce((sum, q) => sum + Number(q.points), 0);
    };

    // Aggregate data from questions: For each CO-ILO-cognitive level, get count (no. of items) and sumPoints (equi points/total)
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

    return (
        <div className={layout.container}>
            {outcomeData.map(co => (
                <div key={co.co} className={layout.section}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2>{co.co}</h2>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Total Points:
                            <input
                                type="text"
                                disabled
                                value={getCoComputedTotal(co.co)}
                                className={layout.numberInput}
                                style={{ width: '50px', textAlign: 'center', fontWeight: '500', backgroundColor: '#FFFFFF', color: '#000000' }}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <textarea
                            disabled
                            value={co.description || `Description`}
                            className={layout.numberInput}
                            style={{ width: '100%', backgroundColor: '#FFFFFF', color: '#000000', textAlign: 'left', resize: 'none', minHeight: '60px' }}
                            rows={3}
                        />
                    </div>
                    {co.ilos.map(ilo => (
                        <div key={ilo.id} style={{ marginBottom: '20px' }}>
                            <h3>{ilo.id}</h3>
                            <div style={{ marginBottom: '10px' }}>
                                <textarea
                                    disabled
                                    value={ilo.description || ''}
                                    className={layout.numberInput}
                                    style={{ width: '100%', backgroundColor: '#FFFFFF', color: '#000000', textAlign: 'left', resize: 'none', minHeight: '40px' }}
                                    rows={2}
                                />
                            </div>

                            {/* Table for cognitive levels */}
                            <table className={`${layout.qctable} ${layout.TOSTable}`}>
                                <thead>
                                <tr>
                                    <th>
                                        <div className={`${layout.cellBox} ${layout.mainHeader}`}></div>
                                    </th>
                                    {cognitiveLevels.map(level => (
                                        <th key={level}>
                                            <div className={`${layout.cellBox} ${layout.mainHeader}`}>{level}</div>
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {/* Row: no. of items */}
                                <tr>
                                    <td>
                                        <div className={`${layout.cellBox} ${layout.leftAlign}`}>Number of Items</div>
                                    </td>
                                    {cognitiveLevels.map(level => (
                                        <td key={level}>
                                            <div className={layout.cellBox}>
                                                {aggregatedData[co.co][ilo.id][level].count}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                                {/* Row: equi points */}
                                <tr>
                                    <td>
                                        <div className={`${layout.cellBox} ${layout.leftAlign}`}>Equivalent Points</div>
                                    </td>
                                    {cognitiveLevels.map(level => (
                                        <td key={level}>
                                            <div className={layout.cellBox}>
                                                {aggregatedData[co.co][ilo.id][level].sumPoints}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                                {/* Row: total */}
                                <tr>
                                    <td>
                                        <div className={`${layout.cellBox} ${layout.leftAlign}`} style={{ fontWeight: '500' }}>Total</div>
                                    </td>
                                    {cognitiveLevels.map(level => (
                                        <td key={level}>
                                            <div className={layout.cellBox} style={{ fontWeight: '500' }}>  {/* Bold text for data */}
                                                {aggregatedData[co.co][ilo.id][level].sumPoints}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            ))}
        </div>

    );

};

export default TOSSummary;
