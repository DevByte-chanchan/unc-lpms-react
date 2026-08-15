'use strict';

function convertNumberedPlaceholders(sql) {
    const positions = [];
    let converted = '';
    let inSingleQuotedValue = false;

    for (let index = 0; index < sql.length; index += 1) {
        const char = sql[index];

        if (char === "'") {
            converted += char;
            if (inSingleQuotedValue && sql[index + 1] === "'") {
                converted += sql[index + 1];
                index += 1;
            } else {
                inSingleQuotedValue = !inSingleQuotedValue;
            }
            continue;
        }

        if (!inSingleQuotedValue && char === '$') {
            const number = /^\d+/.exec(sql.slice(index + 1));
            if (number) {
                positions.push(Number(number[0]));
                converted += '?';
                index += number[0].length;
                continue;
            }
        }

        converted += char;
    }

    return { sql: converted, positions };
}

module.exports = { convertNumberedPlaceholders };
