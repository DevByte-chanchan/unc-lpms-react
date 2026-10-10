import re

content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()

# Fix renamed function usages
content = content.replace("handleTotalItemsChange", "handleTotalPointsChange")

# Fix remaining leftover props sent to AssessmentsStep or wherever they are
content = re.sub(r'\s*rubricCategories=\{rubricCategories\}\n', '\n', content)
content = re.sub(r'\s*setRubricCategories=\{setRubricCategories\}\n', '\n', content)

# Check line 861 and 863 filledCount and allFilled
content = content.replace("filledCount={filledCount}", "")
content = content.replace("allFilled={allFilled}", "")

open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
