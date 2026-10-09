const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');

// KEEP THE PROCESS ALIVE WHEN A QUERY FAILS.
//
// This backend exited on its own once, and it cost a day of "the data is
// gone":
//
//     Server listening on 5000
//     SqliteError: no such table: Users        ← ONE missing table…
//     Node.js v24.19.0                         ← …and the process was gone
//
// Node 24 terminates on an unhandled promise rejection, and the sqlite3
// compatibility shim in models/index.js reports a failed query twice — once
// through the callback (handled) and once by rethrowing (not). So a query
// error that application code had correctly caught still killed the server,
// and every screen in the app went blank at the same moment, for a reason
// none of them had anything to do with.
//
// A failed query must degrade one request. It must never take down the routes
// that had nothing to do with it.
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection (the server is staying up):', reason);
});

const configuredOrigins = new Set(
    String(process.env.LPMS_ALLOWED_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean)
);
const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (configuredOrigins.has(origin)) return true;
    if (process.env.NODE_ENV === 'production') return false;
    try {
        const url = new URL(origin);
        return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    } catch {
        return false;
    }
};

app.use(cors({
    // Credentialed sessions require an exact origin, never "*". Development
    // accepts only loopback Vite ports; deployments opt in explicit origins.
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin) ? origin || false : false),
    credentials: true
}));

app.use(express.json());

// routes
// Sign-in / sign-up. Mounted first because nothing else depends on it and it
// is the one route group that must work before the app renders anything.
app.use('/api/auth', require('./routes/auth'));

// Everything below this point reads or mutates institutional learning-plan
// data. Browser route guards are only presentation; this is the server-owned
// authentication boundary for every business API.
app.use('/api', require('./middleware/auth').requireAuth);

app.use('/api', require('./middleware/auth').restrictSuperuser);

// Audit trail of every state-changing request (sign-in events are recorded by authController).
app.use('/api', require('./utils/audit').auditMiddleware);

const assignmentRoutes = require('./routes/assignments');
app.use('/api/assignments', assignmentRoutes);

const iloRoutes = require('./routes/ilos');
app.use('/api/ilos', iloRoutes);

const courseDetailsRoutes = require('./routes/courseDetails');
app.use('/api/course-details', courseDetailsRoutes);

const courseOutcomeAlignmentRoutes = require('./routes/courseOutcomeAlignment');
app.use('/api/course-outcome-alignment', courseOutcomeAlignmentRoutes);
app.use('/api/program-outcomes', require('./routes/programOutcomes'));

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
app.use('/api/coaep', require('./routes/coaepRoutes'));
app.use('/api/form-settings', require('./routes/formSettings'));
app.use('/api/course-consultants', require('./routes/courseConsultants'));
app.use('/api/offerings', require('./routes/offerings'));
app.use('/api/audit-logs', require('./routes/auditLogs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api', require('./routes/exportPdf'));

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Sign-in needs a Users table that arrived later than every other table here,
// via a migration nothing else in this app has ever required. Rather than
// depend on someone having remembered to run it, create it if it is missing —
// idempotent, additive, and it touches no other table. See
// utils/ensureAuthSchema.js.
//
// Awaited BEFORE listening, so there is no window in which the port is open
// and the table is not there yet. It cannot throw; a database that will not
// cooperate leaves sign-in degraded and everything else working.
(async () => {
    await require('./utils/ensureAuthSchema').ensureAuthSchemaAndReport();
    app.listen(port, () => console.log(`Server listening on ${port}`));
    // Read notifications older than 90 days are removed at boot and then daily.
    require('./utils/notificationRetention').startRetention({ Notification: require('./models').Notification });
})();
