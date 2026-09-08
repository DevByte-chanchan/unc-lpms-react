const fs = require('fs');
let c1 = fs.readFileSync('composition/client/src/pages/ReferenceForm.jsx', 'utf8');

// The InlineModal usage
const oldModalStr = `<InlineModal
                isOpen={isAddOpen}
                title="Add Reference"
                onClose={() => setIsAddOpen(false)}
                actions={<button style={{ color: "white", fontWeight: 400 }} className="confirmBtn" onClick={handleSaveNewRefLocal}>Add</button>}
            >
                <div style={{ display: 'grid', gap: 12 }}>
                    <Dropdown
                        label="Type"
                        value={newRefDraft.type}
                        options={['Textbook', 'Open Educational Resources', 'Online Resources']}
                        onChange={(v) => setNewRefDraft(prev => ({ ...prev, type: v }))}
                    />
                    {renderDynamicFields()}
                    {validationError && <div style={{ color: '#b00020' }}>{validationError}</div>}
                </div>
            </InlineModal>`;

const newModalStr = `<InlineModal
                isOpen={isAddOpen}
                title="Add New Custom Reference"
                onClose={() => setIsAddOpen(false)}
                actions={<button style={{ color: "white", fontWeight: 500, padding: '8px 20px', borderRadius: '4px' }} className="confirmBtn" onClick={handleSaveNewRefLocal}>Add Reference</button>}
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', padding: '10px 0' }}>
                    <Dropdown
                        label="Reference Material Type"
                        value={newRefDraft.type}
                        options={['Textbook', 'Open Educational Resources', 'Online Resources']}
                        onChange={(v) => setNewRefDraft(prev => ({ ...prev, type: v }))}
                    />
                    <div style={{ padding: '4px' }}></div>
                    {renderDynamicFields()}
                    {validationError && <div style={{ color: '#d32f2f', fontWeight: '500', marginTop: '4px', fontSize: '0.9rem' }}>{validationError}</div>}
                </div>
            </InlineModal>`;

c1 = c1.replace(oldModalStr, newModalStr);

fs.writeFileSync('composition/client/src/pages/ReferenceForm.jsx', c1, 'utf8');
console.log('Fixed ReferenceForm popup');