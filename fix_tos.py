import re

content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()

# 1. Fix JSX ternaries
content = content.replace("{historyPage === 'tosReport' && (() => {", "{historyPage === 'tosReport' ? (() => {")
content = content.replace("})()}\n                                    ) : (", "})()\n                                    : (")

# 2. Fix the submit tooltip
old_tooltip = "<span className={styles.submitTooltip}>{!allFilled ? 'Disabled due to incomplete assessment items' : !allItemsHavePoints ? 'Disabled due to items missing points' : 'Disabled due to unresolved comments'}</span>"
new_tooltip = "<span className={styles.submitTooltip}>{!allIlosComplete ? 'Some ILOs do not match their allocated points' : !allItemsHavePoints ? 'A row is missing points' : 'Unresolved comments'}</span>"
content = content.replace(old_tooltip, new_tooltip)

# 3. Fix totalPoints payload
content = content.replace("totalPoints: r.totalPoints || 0,", "totalItems: r.totalPoints || 0,")

# 4. Fix handleTotalItemsChange usages
content = content.replace("handleTotalItemsChange(coIndex, e.target.value)", "handleTotalPointsChange(e.target.value)")

# 5. Remove unused variables
content = content.replace("const TosSections = ({status, role = 'instructor'}) => {", "const TosSections = ({role = 'instructor'}) => {")
content = re.sub(r'import BuilderNavigation.*?;\n', '', content)
content = re.sub(r'\s*const \[showBuilder, setShowBuilder\] = useState\(false\);\n', '\n', content)
content = re.sub(r'\s*const \[builderFilledCount, setBuilderFilledCount\] = useState\(0\);\n', '\n', content)
content = re.sub(r'\s*const \[showClearConfirm, setShowClearConfirm\] = useState\(false\);\n', '\n', content)
content = re.sub(r'\s*const \[builderKey, setBuilderKey\] = useState\(0\);\n', '\n', content)
content = re.sub(r'\s*const builderSaveRef = useRef\(null\);\n', '\n', content)
content = re.sub(r'\s*const \[builderLoading, setBuilderLoading\] = useState\(false\);\n', '\n', content)
content = re.sub(r'\s*const prevShowBuilder = useRef\(showBuilder\);[\s\S]*?\}, \[showBuilder\]\);\n', '\n', content)

content = re.sub(r'\s*const handleBuilderProgress = \(filled\) => \{\s*setBuilderFilledCount\(filled\);\s*\};\n', '\n', content)
content = re.sub(r'\s*const handleClearAll = \(\) => \{[\s\S]*?setShowClearConfirm\(false\);\s*\};\n', '\n', content)
content = re.sub(r'\s*const handleBuilderExport = \(\) => \{[\s\S]*?URL\.revokeObjectURL\(url\);\s*\};\n', '\n', content)

# 6. Remove BuilderNavigation and the ternary safely
content = re.sub(r'\{\s*showBuilder\s*\?\s*\([\s\S]*?<BuilderNavigation[\s\S]*?/>\s*\)\s*:\s*\(', '', content)
content = re.sub(r'</div>\s*\)\}\s*<div className=\{styles\[\'dynamic-sections\'\]\}', '</div>\n\n                <div className={styles[\'dynamic-sections\']}', content)

open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
