'use strict';

// Merges exact duplicate references in the library (see utils/mergeDuplicateReferences.js).
// Dry run by default; back up the database first, then add --yes:
//
//   node merge-duplicate-references.js          (shows what would be merged)
//   node merge-duplicate-references.js --yes    (merges them)

const { mergeDuplicateReferences } = require('./utils/mergeDuplicateReferences');

const apply = process.argv.includes('--yes');
mergeDuplicateReferences({ apply })
    .then(({ groups, removed, merges }) => {
        console.log(apply ? `Merged ${groups} duplicate title(s), removed ${removed} extra row(s):` : `Would merge ${groups} duplicate title(s), removing ${removed} extra row(s) (nothing changed, add --yes to apply):`);
        for (const { title, keep, drop } of merges) console.log(`  - ${title}: keep #${keep}, merge #${drop.join(', #')}`);
        if (groups === 0) console.log('  (no duplicates)');
        process.exit(0);
    })
    .catch(error => { console.error(`Failed, nothing was changed: ${error.message}`); process.exit(1); });
