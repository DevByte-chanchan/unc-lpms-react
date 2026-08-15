'use strict';

const assert = require('assert');

let convertNumberedPlaceholders;
let prepareNumberedStatement;
try {
    ({ convertNumberedPlaceholders, prepareNumberedStatement } = require('./sqlPlaceholders'));
} catch {
    // RED should be an assertion about the missing behavior, not a module error.
}

assert.strictEqual(
    typeof convertNumberedPlaceholders,
    'function',
    'a quote-aware numbered-placeholder converter must exist'
);

assert.strictEqual(
    typeof prepareNumberedStatement,
    'function',
    'statement preparation must capture placeholder positions per statement'
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
    const Database = require('better-sqlite3');
    const raw = new Database(':memory:');
    const params = { $1: 'first value', $2: 'second value' };

    const first = prepareNumberedStatement(raw, 'SELECT $2 AS picked');
    const second = prepareNumberedStatement(raw, 'SELECT $1 AS picked');

    const firstResult = first.statement.get(
        ...first.positions.map(position => params[`$${position}`])
    );
    const secondResult = second.statement.get(
        ...second.positions.map(position => params[`$${position}`])
    );

    assert.strictEqual(
        firstResult.picked,
        'second value',
        'preparing another statement must not replace the first statement binding order'
    );
    assert.strictEqual(secondResult.picked, 'first value');
    raw.close();
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

console.log('4 SQL placeholder checks passed.');
