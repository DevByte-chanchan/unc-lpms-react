import re

content = open('backend/models/index.js', 'r', encoding='utf-8').read()

content = content.replace("Course.hasOne(TosStatus, { foreignKey: 'courseCode', as: 'tosStatus' });", "Course.hasMany(TosStatus, { foreignKey: 'courseCode', as: 'tosStatuses' });")

open('backend/models/index.js', 'w', encoding='utf-8').write(content)
