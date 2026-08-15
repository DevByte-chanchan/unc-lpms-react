'use strict';

const assert = require('assert');

let convertNumberedPlaceholders;
try {
    ({ convertNumberedPlaceholders } = require('./sqlPlaceholders'));
} catch {
    // RED should be an assertion about the missing behavior, not a module error.
}

assert.strictEqual(
    typeof convertNumberedPlaceholders,
    'function',
    'a quote-aware numbered-placeholder converter must exist'
);

{
    const converted = convertNumberedPlaceholders(
        'SELECT * FROM Users WHERE role = $2 AND email = $1'
    );
    assert.strictEqual(
        converted.sql,
        'SELECT * FROM Users WHERE role = ? AND email = ?',
        'numbered placeholders outside literals should become question marks'
    );
    assert.deepStrictEqual(
        converted.positions,
        [2, 1],
        'binding order should follow placeholder appearance order'
    );
}

{
    const hash = 'scrypt$16384$8$1$salt$hash';
    const converted = convertNumberedPlaceholders(
        `INSERT INTO Users (password_hash, role) VALUES ('${hash}', $1)`
    );
    assert.strictEqual(
        converted.sql,
        `INSERT INTO Users (password_hash, role) VALUES ('${hash}', ?)`,
        'dollar-prefixed hash fields inside a SQL literal must be preserved byte-for-byte'
    );
    assert.deepStrictEqual(converted.positions, [1]);
}

{
    const converted = convertNumberedPlaceholders(
        "SELECT 'O''Brien owes $2' AS note, $3 AS actual"
    );
    assert.strictEqual(
        converted.sql,
        "SELECT 'O''Brien owes $2' AS note, ? AS actual",
        'a doubled single quote must not end the SQL literal'
    );
    assert.deepStrictEqual(converted.positions, [3]);
}

console.log('3 SQL placeholder checks passed.');
