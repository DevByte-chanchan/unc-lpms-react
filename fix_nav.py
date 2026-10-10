import re
content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()
content = re.sub(r'\{\s*showBuilder\s*\?\s*\(\s*<BuilderNavigation[\s\S]*?/>\s*\)\s*:\s*\(', '', content)
content = re.sub(r'</select>\s*</div>\s*</div>\s*\)\s*\}', '</select>\n                        </div>\n                    </div>', content)
open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
