import re

content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()

block_start = "{showClearConfirm && ("
block_end = ")}\n\n            {showApproveConfirm && ("

start_idx = content.find(block_start)
if start_idx != -1:
    end_idx = content.find(block_end, start_idx)
    if end_idx != -1:
        content = content[:start_idx] + "{showApproveConfirm && (" + content[end_idx + len(block_end):]

open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
