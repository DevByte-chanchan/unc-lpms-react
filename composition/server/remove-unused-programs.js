'use strict';

// Removes the four demo programs that were seeded with no courses (see utils/unusedPrograms.js).
// Dry run by default; back up the database first, then add --yes:
//
//   node remove-unused-programs.js          (shows what would be removed)
//   node remove-unused-programs.js --yes    (removes it)

const { removeUnusedPrograms } = require('./utils/unusedPrograms');

const apply = process.argv.includes('--yes');
removeUnusedPrograms({ apply })
    .then(({ removed, kept, missing }) => {
        console.log(apply ? 'Removed:' : 'Would remove (nothing changed, add --yes to apply):');
        for (const name of removed) console.log(`  - ${name}`);
        if (removed.length === 0) console.log('  (none)');
        for (const { name, reason } of kept) console.log(`Kept ${name}: in use (${reason}).`);
        for (const name of missing) console.log(`Not found: ${name}`);
        process.exit(0);
    })
    .catch(error => { console.error(`Failed, nothing was changed: ${error.message}`); process.exit(1); });
