'use strict';

const crypto = require('crypto');

// Random password from an unambiguous alphabet (no 0/O, 1/l/I). Always contains a letter and a
// digit, so it passes the sign-in password rules. Never a fixed or shared value.
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const ALPHABET = LETTERS + DIGITS;

const generatePassword = (length = 16) => {
    for (;;) {
        let password = '';
        for (let i = 0; i < length; i += 1) password += ALPHABET[crypto.randomInt(ALPHABET.length)];
        if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) return password;
    }
};

module.exports = { generatePassword };
