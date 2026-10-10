import re

content = open('backend/seed_new_courses.js', 'r', encoding='utf-8').read()

# I see if (item.choices && item.choices.length > 0) { block is there. Let's rip it out properly.
content = re.sub(r'\s*if \(item\.choices && item\.choices\.length > 0\) \{[\s\S]*?\} else if \(item\.rubricRows && item\.rubricRows\.length > 0\) \{[\s\S]*?\}', '', content)

open('backend/seed_new_courses.js', 'w', encoding='utf-8').write(content)
