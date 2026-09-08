const fs = require('fs');
const content = fs.readFileSync('composition/server/seeders/20260528000000-seed-approved-lp-oop.js', 'utf8');

const TlaAssessExt = /const tlaAssessmentInserts = \[\];[\s\S]*?await queryInterface\.bulkInsert\('TLAAssessments', tlaAssessmentInserts, \{\}\);/;
const match = content.match(TlaAssessExt);
if (match) {
    console.log(match[0]);
} else {
    console.log("no match");
}