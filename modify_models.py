import os

models_dir = 'backend/models/'
models_to_update = ['TosStatus.js', 'Comment.js', 'AssessmentItem.js', 'IloAttachment.js']

for filename in models_to_update:
    path = os.path.join(models_dir, filename)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'examPeriod:' not in content:
        # Find where courseCode is defined and inject examPeriod after it
        content = content.replace("courseCode: {", "examPeriod: {\n        type: DataTypes.STRING(20),\n        allowNull: false,\n        defaultValue: 'Midterm',\n        field: 'exam_period'\n    },\n    courseCode: {")
        
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
