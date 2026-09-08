const fs = require('fs');
const content = fs.readFileSync('composition/server/seeders/20260528000000-seed-approved-lp-oop.js', 'utf8');
const lines = content.split('\n');
const start2 = lines.findIndex(l => l.indexOf('tlaAssessmentInserts.push') > -1);
if (start2 > -1) {
    console.log(lines.slice(start2 - 30, start2 + 5).join('\n'));
} else {
    console.log("Not found");
}
