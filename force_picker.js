const fs = require('fs');
let c1 = fs.readFileSync('composition/client/src/components/ReferencePicker.jsx', 'utf8');

// Ensure Textbook Default
c1 = c1.replace("const [activeFilter, setActiveFilter] = useState('All');", "const [activeFilter, setActiveFilter] = useState('Textbook');");
c1 = c1.replace("const types = ['All', 'Textbook', 'Open Educational Resources', 'Online Resources'];", "const types = ['Textbook', 'Open Educational Resources', 'Online Resources'];");

const headerRegex = /\{\/\* Header: search \+ filters \*\/\}[\s\S]*?<div className=\{styles\.list\}>/;
const replaceStr = `{/* Header: search + filters */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                        <div className={styles.filterTabs}>
                            {types.map(type => {
                                const isActive = activeFilter === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        className={\`\${styles.tab} \${isActive ? styles.activeTab : ''}\`}
                                        onClick={() => setActiveFilter(type)}
                                        style={{ 
                                            borderRadius: 0, 
                                            backgroundColor: isActive ? '#007bff' : 'rgba(0,0,0,0.05)',
                                            color: isActive ? '#fff' : 'inherit'
                                        }}
                                    >
                                        {type === 'Open Educational Resources' ? 'OER' : (type === 'Online Resources' ? 'Online' : type)}
                                    </button>
                                );
                            })}
                        </div>
                        
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

                        <button
                            className={styles.selfAdder}
                            type="button"
                            onClick={() => onAddReference && onAddReference()}
                            disabled={disabled}
                            style={{ marginLeft: 8 }}
                        >
                            <Plus size={14} /> Add Reference
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className={styles.list}>`;

if (c1.match(headerRegex)) {
    c1 = c1.replace(headerRegex, replaceStr);
} else {
    console.log("CRITICAL ERROR: REGEX FAILED TO MATCH");
}

fs.writeFileSync('composition/client/src/components/ReferencePicker.jsx', c1, 'utf8');
console.log('Fixed ReferencePicker');
