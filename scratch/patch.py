import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# 1. TOSCoursesTable.jsx
tct_path = 'scratch/TOSCoursesTable.jsx'
replace_in_file(tct_path, [
    (
"""    const displayedCourses = courses.filter(c => {
        if (selectedStatus === 'draft' && c.status !== 'draft') return false;
        if (selectedStatus === 'pending' && c.status !== 'pending') return false;
        if (selectedStatus === 'returned' && c.status !== 'returned') return false;
        if (selectedStatus === 'approved' && c.status !== 'approved') return false;
        if (c.examPeriod && c.examPeriod !== examType) return false;
        return true;
    });""",
"""    const displayedCourses = courses.map(c => {
        const tos = examType === 'Midterm' ? c.midtermTos : c.finalsTos;
        const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';
        return {
            ...c,
            status: tos ? tos.status : 'draft',
            dateSubmitted: tos ? fmt(tos.submittedAt) : '',
            dateStatus: tos ? fmt(tos.returnedAt || tos.approvedAt) : ''
        };
    }).filter(c => {
        if (selectedStatus === 'draft' && c.status !== 'draft') return false;
        if (selectedStatus === 'pending' && c.status !== 'pending') return false;
        if (selectedStatus === 'returned' && c.status !== 'returned') return false;
        if (selectedStatus === 'approved' && c.status !== 'approved') return false;
        return true;
    });"""
    ),
    (
"""                                    {row.status === 'draft' ? (
                                        row.learningPlanApproved === false ? (
                                            <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', cursor: 'not-allowed' }}>
                                                Locked: Learning Plan not approved
                                            </div>
                                        ) : (""",
"""                                    {row.status === 'draft' ? (
                                        (examType === 'Midterm' ? row.midtermLock?.locked : row.finalsLock?.locked) ? (
                                            <div style={{ color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', cursor: 'not-allowed' }}>
                                                {examType === 'Midterm' ? row.midtermLock.reason : row.finalsLock.reason}
                                            </div>
                                        ) : ("""
    )
])

# 2. ProgramHeadTOSCoursesTable.jsx
phtct_path = 'scratch/ProgramHeadTOSCoursesTable.jsx'
replace_in_file(phtct_path, [
    (
"""                let result = fallbackCourses.map(fc => {
                    const api = apiMap[fc.code];
                    seen.add(fc.code);
                    if (!api) return fc;
                    return {
                        ...fc,
                        instructor: api.instructor || fc.instructor,
                        status: api.status || fc.status,
                        dateSubmitted: api.dateSubmitted || fc.dateSubmitted,
                        dateStatus: api.dateStatus || fc.dateStatus,
                        examPeriod: api.examPeriod || fc.examPeriod || 'Midterm',
                    };
                });
                for (const code in apiMap) {
                    if (!seen.has(code)) {
                        const api = apiMap[code];
                        result.push({
                            code: api.code,
                            name: api.name,
                            instructor: api.instructor || '\u2014',
                            dateSubmitted: api.dateSubmitted || '',
                            dateStatus: api.dateStatus || '',
                            status: api.status || 'draft',
                            examPeriod: api.examPeriod || 'Midterm',
                        });
                    }
                }""",
"""                let result = fallbackCourses.map(fc => {
                    const api = apiMap[fc.code];
                    seen.add(fc.code);
                    if (!api) return fc;
                    return api;
                });
                for (const code in apiMap) {
                    if (!seen.has(code)) {
                        result.push(apiMap[code]);
                    }
                }"""
    ),
    (
"""                    {courses
                        .filter(row => row.status === selectedStatus && (!row.examPeriod || row.examPeriod === examType))
                        .map((row, index) => (""",
"""                    {courses
                        .map(row => {
                            const tos = examType === 'Midterm' ? row.midtermTos : row.finalsTos;
                            const fmt = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';
                            return {
                                ...row,
                                status: tos ? tos.status : 'draft',
                                dateSubmitted: tos ? fmt(tos.submittedAt) : '',
                                dateStatus: tos ? fmt(tos.returnedAt || tos.approvedAt) : ''
                            };
                        })
                        .filter(row => row.status === selectedStatus)
                        .map((row, index) => ("""
    )
])

# 3. TosSections.jsx
ts_path = 'scratch/TosSections.jsx'
replace_in_file(ts_path, [
    ("fetchItems(courseCode).then(data => {", "fetchItems(courseCode, examType).then(data => {"),
    ("fetchComments(courseCode).then(data => {", "fetchComments(courseCode, examType).then(data => {"),
    ("fetchStatus(courseCode).then(s => {", "fetchStatus(courseCode, examType).then(s => {"),
    ("await updateStatus(courseCode, 'approved');", "await updateStatus(courseCode, examType, 'approved');"),
    ("await updateStatus(courseCode, 'returned');", "await updateStatus(courseCode, examType, 'returned');"),
    ("<AssessmentsStep", "<AssessmentsStep examType={examType}")
])

# 4. AssessmentsStep.jsx
as_path = 'scratch/AssessmentsStep.jsx'
replace_in_file(as_path, [
    (
"""const AssessmentsStep = ({
    outcomeData,
    questions,
    setQuestions,
    courseCode,
    readOnly = false
}) => {""",
"""const AssessmentsStep = ({
    outcomeData,
    questions,
    setQuestions,
    courseCode,
    examType,
    readOnly = false
}) => {"""
    ),
    (
        "fetchAttachments(courseCode).then(data =>",
        "fetchAttachments(courseCode, examType).then(data =>"
    ),
    (
        "uploadAttachment(courseCode, activeIloData.id, file, 'objective').then(att => {",
        "uploadAttachment(courseCode, examType, activeIloData.id, file, 'objective').then(att => {"
    ),
    (
        "uploadAttachment(courseCode, activeIloData.id, file, 'essay').then(att => {",
        "uploadAttachment(courseCode, examType, activeIloData.id, file, 'essay').then(att => {"
    ),
    (
        "deleteAttachment(courseCode, id).then(() => {",
        "deleteAttachment(courseCode, examType, id).then(() => {"
    )
])

print("Replacements done.")