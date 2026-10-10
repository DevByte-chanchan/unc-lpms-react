import re

content = open('backend/seed.js', 'r', encoding='utf-8').read()

# Fix the trailing syntax error at line 651
content = content.replace("});\n                ))\n                    );\n                }", "});")

open('backend/seed.js', 'w', encoding='utf-8').write(content)
