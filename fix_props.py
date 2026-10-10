import re

content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()

# Remove the unused totalRequired variable since we use allIlosComplete now
content = re.sub(r'\s*const totalRequired = [^\n]*\n', '\n', content)

# Remove builderLoading from the dynamic-sections check
content = content.replace("{(builderLoading || navigating) && (", "{(navigating) && (")

# Remove leftover props passed to AssessmentsStep
content = re.sub(r'\s*key=\{builderKey\}', '', content)
content = re.sub(r'\s*rubricCategories=\{rubricCategories\}', '', content)
content = re.sub(r'\s*setRubricCategories=\{setRubricCategories\}', '', content)
content = re.sub(r'\s*showBuilder=\{showBuilder\}', '', content)
content = re.sub(r'\s*onShowBuilderChange=\{setShowBuilder\}', '', content)
content = re.sub(r'\s*builderSaveRef=\{builderSaveRef\}', '', content)
content = re.sub(r'\s*onProgressUpdate=\{handleBuilderProgress\}', '', content)

# Remove the showClearConfirm modal entirely
content = re.sub(r'\s*\{showClearConfirm && \([\s\S]*?</svg>\s*</div>\s*\)\}\s*', '\n', content)

open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
