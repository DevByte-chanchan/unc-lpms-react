const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { attachUser } = require('./middleware/auth');
const app = express();
const port = 5000;

app.use(cors({
    origin: [
        'http://localhost:5174',
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:5173',
        'http://192.168.254.107:8081',
        'http://100.74.215.45:8081',
    ],
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

// routes
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRoutes);

const academicPeriodsRoutes = require('./routes/academicPeriods');
app.use('/api/academic-periods', academicPeriodsRoutes);

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
const notificationRoutes = require('./routes/notifications');

app.use('/api/revisions', revisionRoutes);
app.use('/api/references', referencesRoutes);
app.use('/api/ilo-references', iloReferencesRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/tlas', tlaRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/course-coverage', courseCoverageRoutes);
app.use('/api', courseReferenceRoutes);
app.use('/api/submit-learning-plan', submissionRoutes);
app.use('/api/notifications', notificationRoutes);

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (require.main === module) {
    app.listen(port, () => console.log(`Server listening on ${port}`));
}
module.exports = app;
