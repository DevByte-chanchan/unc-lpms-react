'use strict';

// The ISO form identity (document control number, revision, effectivity) as the API shows it. The values are
// read by the exports; nothing in the application edits them any more.

const toApi = (row) => ({ docControlNo: row.doc_control_no, revisionNo: row.revision_no, effectivity: row.effectivity });

module.exports = { toApi };
