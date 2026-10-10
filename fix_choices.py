import re

for filename in ['src/components/TosSections.jsx', 'src/pages/TosPreview.jsx', 'src/pages/TosSummary.jsx']:
    try:
        content = open(filename, 'r', encoding='utf-8').read()
        
        # Remove choices rendering block
        content = re.sub(r'\{\s*q\.choices.*?&& \([\s\S]*?</div>\s*\)\s*\}', '', content)
        
        # Remove rubrics rendering block
        content = re.sub(r'\{\s*q\.rubricRows.*?&& \([\s\S]*?</div>\s*\)\s*\}', '', content)
        
        # Remove rubric categories state
        content = re.sub(r'\s*const \[rubricCategories, setRubricCategories\] = useState\(\[\]\);\n', '\n', content)
        
        open(filename, 'w', encoding='utf-8').write(content)
    except FileNotFoundError:
        pass

