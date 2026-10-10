import re

content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()

# 1. Remove BuilderNavigation import
content = re.sub(r'import BuilderNavigation.*?;\n', '', content)

# 2. Remove unused status
content = content.replace("const TosSections = ({status, role = 'instructor'}) => {", "const TosSections = ({role = 'instructor'}) => {")

# 3. Remove showBuilder state and builderFilledCount
content = re.sub(r'\s*const \[showBuilder, setShowBuilder\] = useState\(false\);\n', '\n', content)
content = re.sub(r'\s*const \[builderFilledCount, setBuilderFilledCount\] = useState\(0\);\n', '\n', content)

# 4. Remove choices and rubrics logic (some might be left)
content = re.sub(r'\s*choices:\s*\[\],\n', '\n', content)
content = re.sub(r'\s*choices:\s*\(it\.choices.*?,\n', '\n', content)
content = re.sub(r'\s*rubricRows:\s*\[\],\n', '\n', content)
content = re.sub(r'\s*rubric:\s*it\.rubricRows,\n', '\n', content)

# 5. Fix the tooltip text
old_tooltip = "<span className={styles.submitTooltip}>{!allIlosComplete ? 'Disabled due to incomplete assessment items' : !allItemsHavePoints ? 'Disabled due to items missing points' : 'Disabled due to unresolved comments'}</span>"
new_tooltip = "<span className={styles.submitTooltip}>{!allIlosComplete ? 'Some ILOs do not match their allocated points' : !allItemsHavePoints ? 'A row is missing points' : 'Unresolved comments'}</span>"
content = content.replace(old_tooltip, new_tooltip)

open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
