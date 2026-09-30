'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const protectedRouters = [
    ['course details', require('../routes/courseDetails')],
    ['course criteria', require('../routes/courseCriteria')],
    ['course coverage', require('../routes/courseCoverage')],
    ['course outcome alignment', require('../routes/courseOutcomeAlignment')],
    ['revision history', require('../routes/revisionRoutes')],
    ['course references', require('../routes/courseReferenceRoutes')],
    ['COAEP', require('../routes/coaepRoutes')]
];

test('every course-scoped read route authorizes the requested course before its controller', () => {
    for (const [label, router] of protectedRouters) {
        const routes = router.stack.filter(layer => layer.route);
        assert.ok(routes.length > 0, `${label} router must expose a route`);
        for (const layer of routes) {
            assert.ok(
                layer.route.stack.length >= 2,
                `${label} ${layer.route.path} must have course authorization before the controller`
            );
        }
    }
});
