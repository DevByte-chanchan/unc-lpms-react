// Load .env file automatically if present
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    try {
        const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of envLines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx > 0) {
                    const key = trimmed.slice(0, eqIdx).trim();
                    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
                    if (!process.env[key]) {
                        process.env[key] = val;
                    }
                }
            }
        }
    } catch (e) {
        console.warn('Could not parse .env file:', e.message);
    }
}

const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

app.use(cors({
    origin: [
        'http://localhost:8081',
        'http://192.168.254.107:8081',
        'http://100.74.215.45:8081',
    ]
}));

app.use(express.json());

// routes
const assignmentRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentRoutes);

const iloRoutes = require('./routes/ilos');
app.use('/api/ilos', iloRoutes);

const courseDetailsRoutes = require('./routes/courseDetails');
app.use('/api/course-details', courseDetailsRoutes);

const courseOutcomeAlignmentRoutes = require('./routes/courseOutcomeAlignment');
app.use('/api/course-outcome-alignment', courseOutcomeAlignmentRoutes);

const courseCriteriaRoutes = require('./routes/courseCriteria');
app.use('/api/course-criteria', courseCriteriaRoutes);

const referencesRoutes = require('./routes/references');
const iloReferencesRoutes = require('./routes/iloReferences');
const topicsRoutes = require('./routes/topics');
const tlaRoutes = require('./routes/tlaRoutes');
const commentRoutes = require('./routes/comments');
const courseCoverageRoutes = require('./routes/courseCoverage');
const courseReferenceRoutes = require('./routes/courseReferenceRoutes');
const revisionRoutes = require('./routes/revisionRoutes');
const submissionRoutes = require('./routes/submissionRoutes');

app.use('/api/revisions', revisionRoutes);
app.use('/api/references', referencesRoutes);
app.use('/api/ilo-references', iloReferencesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/tlas', tlaRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/course-coverage', courseCoverageRoutes);
app.use('/api', courseReferenceRoutes);
app.use('/api/submit-learning-plan', submissionRoutes);

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => console.log(`Server listening on ${port}`));
