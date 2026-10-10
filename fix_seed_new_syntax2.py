import re

content = open('backend/seed_new_courses.js', 'r', encoding='utf-8').read()

content = content.replace("});))\n                );\n            }", "});")

open('backend/seed_new_courses.js', 'w', encoding='utf-8').write(content)
