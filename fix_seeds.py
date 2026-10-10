import re

for filename in ['backend/seed.js', 'backend/seed_new_courses.js']:
    content = open(filename, 'r', encoding='utf-8').read()
    
    # Remove imports
    content = content.replace(", ItemChoice, ItemRubric", "")
    
    # Remove ItemChoice bulkCreate block
    content = re.sub(r'if \(item\.choices\) \{[\s\S]*?\}', '', content)
    
    # Remove ItemRubric bulkCreate block
    content = re.sub(r'if \(item\.rubricRows\) \{[\s\S]*?\}', '', content)
    
    open(filename, 'w', encoding='utf-8').write(content)
