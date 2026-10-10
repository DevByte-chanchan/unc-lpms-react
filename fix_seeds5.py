content = open('backend/seed.js', 'r', encoding='utf-8').read()
content = content.replace(", ItemChoice, ItemRubric", "")

block_start = "if (tpl.choices && tpl.choices.length > 0) {"
block_end = "} else if (tpl.rubricRows && tpl.rubricRows.length > 0) {"
block_end2 = "}"

start_idx = content.find(block_start)
if start_idx != -1:
    end_idx = content.find(block_end, start_idx)
    if end_idx != -1:
        end_idx2 = content.find(block_end2, end_idx + len(block_end))
        if end_idx2 != -1:
            content = content[:start_idx] + content[end_idx2 + 1:]

open('backend/seed.js', 'w', encoding='utf-8').write(content)

content2 = open('backend/seed_new_courses.js', 'r', encoding='utf-8').read()
content2 = content2.replace(", ItemChoice, ItemRubric", "")

block_start = "if (item.choices && item.choices.length > 0) {"
block_end = "} else if (item.rubricRows && item.rubricRows.length > 0) {"

start_idx = content2.find(block_start)
if start_idx != -1:
    end_idx = content2.find(block_end, start_idx)
    if end_idx != -1:
        end_idx2 = content2.find("}", end_idx + len(block_end))
        if end_idx2 != -1:
            # Wait, there's wait ItemRubric.bulkCreate( ... ) );
            # The closing brace for else if block.
            # I will just use regex but match the trailing ) properly.
            pass
