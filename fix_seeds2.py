import re

for filename in ['backend/seed.js', 'backend/seed_new_courses.js']:
    content = open(filename, 'r', encoding='utf-8').read()
    
    # Remove ItemChoice and ItemRubric blocks
    content = re.sub(r'\s*if \(tpl\.choices && tpl\.choices\.length > 0\) \{[\s\S]*?\} else if \(tpl\.rubricRows && tpl\.rubricRows\.length > 0\) \{[\s\S]*?\}', '', content)
    
    open(filename, 'w', encoding='utf-8').write(content)
