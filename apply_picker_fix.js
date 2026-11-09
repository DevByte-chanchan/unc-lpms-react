const fs = require('fs');
let c1 = fs.readFileSync('composition/client/src/components/ReferencePicker.jsx', 'utf8');

const targetStr = `{/* Header: search + filters */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                        <div className={styles.searchBar} style={{ flex: 1 }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={disabled}
                            />
                        </div>

                        <div className={styles.filterTabs} style={{ marginLeft: 12 }}>
                            {types.map(type => {
                                const isActive = activeFilter === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className={\`\${styles.tab} \${isActive ? styles.activeTab : ''}\`}
                                        onClick={() => setActiveFilter(type)}
                                    >
                                        {type === 'Open Educational Resources' ? 'OER' : (type === 'Online Resources' ? 'Online' : type)}
                                    </button>
                                );
                            })}

                            <button
                                className={styles.selfAdder}
                                type="button"
                                onClick={() => onAddReference && onAddReference()}
                                disabled={disabled}
                                style={{ marginLeft: 8 }}
                            >
                                <Plus size={14} />&nbsp; Add my own Reference
                            </button>
                        </div>
                    </div>
                </div>`;

const replaceStr = `{/* Header: search + filters */}
                <div className={styles.header} style={{ display: 'flex', alignItems: 'stretch', padding: 0, borderBottom: '1px solid #ccc' }}>
                    <div style={{ display: 'flex', flex: '0 0 auto', margin: 0, gap: 0, overflow: 'hidden', borderTopLeftRadius: '6px' }}>
                        {types.map((type, index) => {
                            const isActive = activeFilter === type;
                            return (
                                <button
                                    key={type}
                                    type="button"
                                    style={{
                                        border: 'none',
                                        padding: '0 20px',
                                        backgroundColor: isActive ? '#fff' : '#f4f4f4',
                                        color: isActive ? '#0056b3' : '#666',
                                        fontWeight: isActive ? 600 : 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: '100%',
                                        transition: 'background-color 0.2s',
                                        borderRight: '1px solid #e0e0e0'
                                    }}
                                    onClick={() => setActiveFilter(type)}
                                >
                                    {type === 'Open Educational Resources' ? 'OER' : (type === 'Online Resources' ? 'Online' : type)}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div style={{ display: 'flex', flex: 1, alignItems: 'center', padding: '8px 12px', gap: 12, backgroundColor: '#fff' }}>
                        <div className={styles.searchBar} style={{ flex: 1, border: 'none', background: 'transparent' }}>
                            <Search size={16} color="#666" />
                            <input
                                type="text"
                                placeholder="Search references..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                disabled={disabled}
                                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent' }}
                            />
                        </div>

                        <button
                            type="button"
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '8px', 
                                whiteSpace: 'nowrap', padding: '8px 12px', 
                                background: '#1a73e8', color: 'white', 
                                borderRadius: '4px', border: 'none', 
                                fontWeight: 500, cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                            onClick={() => onAddReference && onAddReference()}
                            disabled={disabled}
                        >
                            <Plus size={14} /> Add Reference
                        </button>
                    </div>
                </div>`;

c1 = c1.replace(targetStr, replaceStr);
fs.writeFileSync('composition/client/src/components/ReferencePicker.jsx', c1, 'utf8');
console.log('Successfully replaced exact ReferencePicker UI block');