import re

content = open('src/components/TosSections.jsx', 'r', encoding='utf-8').read()

# I want to completely remove the ternary wrapper:
# {showBuilder ? (
#    <BuilderNavigation ... />
# ) : (
#    <div className={styles.navi}>
#
# AND the corresponding )} near the end.

# First, let's locate <div className={styles.container}>
# Then we will find {showBuilder and just replace the whole block down to <div className={styles.navi}> with <div className={styles.navi}>
pattern = re.compile(r'\{\s*showBuilder\s*\?\s*\([\s\S]*?/>\s*\)\s*:\s*\(\s*<div className=\{styles\.navi\}>')
content = pattern.sub('<div className={styles.navi}>', content)

# Then we need to find the )} that closes the ternary.
# It is located around line 2198, just before </div>\n            </div>\n\n            <TOSPreview
# Let's replace </>\n                    )}\n                </div>\n            </div>\n\n            <TOSPreview with </>\n                </div>\n            </div>\n\n            <TOSPreview

content = content.replace("</>\n                    )}\n                </div>\n            </div>\n\n            <TOSPreview", "</>\n                </div>\n            </div>\n\n            <TOSPreview")

# Also, there's another occurrence of showBuilder={showBuilder}? No, I deleted them.

open('src/components/TosSections.jsx', 'w', encoding='utf-8').write(content)
