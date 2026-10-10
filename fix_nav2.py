import re
content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()
content = re.sub(r'\s*const prevShowBuilder = useRef\(showBuilder\);[\s\S]*?\}, \[showBuilder\]\);', '', content)
content = re.sub(r'\s*showBuilder=\{showBuilder\}', '', content)
content = re.sub(r'\s*onShowBuilderChange=\{setShowBuilder\}', '', content)
open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
