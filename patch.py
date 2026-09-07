import re
import os

def process_file(path, regex_list):
    if not os.path.exists(path): return
    with open(path, 'r') as f: content = f.read()
    for pattern, repl in regex_list:
        content = re.sub(pattern, repl, content, flags=re.DOTALL)
    with open(path, 'w') as f: f.write(content)

process_file('composition/server/models/intendedLearningOutcome.js', [
    (r'\s*hours:\s*\{[^}]+\}\s*,', ''),
    (r'\s*weeks:\s*\{[^}]+\}\s*,', '')
])

process_file('composition/server/migrations/20260514000400-create-intended-learning-outcome.js', [
    (r'\s*hours:\s*\{[^}]+\}\s*,', ''),
    (r'\s*weeks:\s*\{[^}]+\}\s*,', '')
])

process_file('composition/server/controllers/courseCoverageController.js', [
    (r'const duration = Math\.trunc\(ilo\.weeks\) \|\| 0;.*?(?=return \{)', 'const deliveryWeekString = "Week 1";\n            '),
    (r'allocatedTime: `\(\$\{ilo\.hours \|\| 0\} hrs\)`', 'allocatedTime: "(4 hrs)"')
])

process_file('composition/server/controllers/iloController.js', [
    (r", 'hours', 'weeks'", ""),
    (r"\s*hours: ilo\.hours,\s*weeks: ilo\.weeks,", "")
])

process_file('composition/server/routes/ilos.js', [
    (r'const \{updateIloSchedule\}[^\n]+', ''),
    (r'router\.put\(\'/:ilo_id/schedule\', updateIloSchedule\);', '')
])

try:
    os.remove('composition/server/controllers/iloScheduleController.js')
except:
    pass
