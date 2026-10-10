import re

for filename in ['backend/seed.js', 'backend/seed_new_courses.js']:
    content = open(filename, 'r', encoding='utf-8').read()
    
    # Remove imports
    content = content.replace(", ItemChoice, ItemRubric", "")
    
    # Remove ItemChoice and ItemRubric blocks
    content = re.sub(r'\s*if \(tpl\.choices && tpl\.choices\.length > 0\) \{[\s\S]*?\} else if \(tpl\.rubricRows && tpl\.rubricRows\.length > 0\) \{[\s\S]*?\}', '', content)
    content = re.sub(r'\s*if \(item\.choices && item\.choices\.length > 0\) \{[\s\S]*?\} else if \(item\.rubricRows && item\.rubricRows\.length > 0\) \{[\s\S]*?\}', '', content)
    
    open(filename, 'w', encoding='utf-8').write(content)
