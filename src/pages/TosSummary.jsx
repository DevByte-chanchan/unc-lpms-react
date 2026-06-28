import React from "react";
import layout from "../styles/TosPreview.module.sass";

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
            .filter(q => q.co === coId && q.points && String(q.points).trim())
            .reduce((sum, q) => sum + Number(q.points), 0);
    };

    const getAggregatedData = () => {
        const data = {};
        outcomeData.forEach(co => {
            data[co.co] = {};
            co.ilos.forEach(ilo => {
                data[co.co][ilo.id] = {};
                cognitiveLevels.forEach(level => {
                    data[co.co][ilo.id][level] = [];
                });
            });
        });
        questions.forEach(q => {
            if (q.co && q.ilo && q.cognitiveLevel && data[q.co] && data[q.co][q.ilo]) {
                const span = q.span || 1;
                const pts = (q.points && String(q.points).trim()) ? Number(q.points) : 0;
                data[q.co][q.ilo][q.cognitiveLevel].push({ span, points: pts });
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

                            <table className={`${layout.qctable} ${layout.noSticky}`}>
                                <thead>
                                <tr>
                                    <th>
                                        <div className={`${layout.cellBox} ${layout.headerCell}`}></div>
                                    </th>
                                    {cognitiveLevels.map(level => (
                                        <th key={level}>
                                            <div className={`${layout.cellBox} ${layout.headerCell}`}>{level}</div>
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td>
                                        <div className={`${layout.cellBox} ${layout.readable}`}>Number of Items</div>
                                    </td>
                                    {cognitiveLevels.map(level => {
                                        const items = aggregatedData[co.co][ilo.id][level];
                                        return (
                                        <td key={level}>
                                            <div className={layout.cellBox} style={{ flexDirection: 'column', gap: 2 }}>
                                                {items.length === 0 ? '0' : items.map((item, i) => (
                                                    <span key={i}>{item.span} x {item.points}</span>
                                                ))}
                                            </div>
                                        </td>
                                        );
                                    })}
                                </tr>
                                <tr>
                                    <td>
                                        <div className={`${layout.cellBox} ${layout.readable}`} style={{ fontWeight: '500' }}>Total Points</div>
                                    </td>
                                    {cognitiveLevels.map(level => (
                                        <td key={level}>
                                            <div className={layout.cellBox} style={{ fontWeight: '500' }}>
                                                {aggregatedData[co.co][ilo.id][level].reduce((s, item) => s + item.points, 0)}
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
