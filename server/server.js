const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

app.use(cors({
    // Allow any localhost dev port (5173/5180/etc.) so the frontend can call the API.
    origin: true
}));

app.use(express.json({ limit: '10mb' }));

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

app.use('/api/references', referencesRoutes);
app.use('/api/ilo-references', iloReferencesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/tlas', tlaRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/course-coverage', courseCoverageRoutes);
app.use('/api', courseReferenceRoutes);

const revisionRoutes = require('./routes/revisionRoutes');
app.use('/api/revisions', revisionRoutes);

const exportPdfRoutes = require('./routes/exportPdf');
app.use('/api', exportPdfRoutes);

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(port, () => console.log(`Server listening on ${port}`));