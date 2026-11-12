'use strict';

// The ISBN lookup: wrong ISBNs are refused, Open Library's answer becomes the form's fields. No network: fetch is stubbed.
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeIsbn, lookupIsbn } = require('./isbnLookup');

test('only valid ISBN-10 and ISBN-13 pass', () => {
    assert.equal(normalizeIsbn('978-0-13-235088-4'), '9780132350884');
    assert.equal(normalizeIsbn('0 13 235088 2'), '0132350882');
    assert.equal(normalizeIsbn('080442957x'), '080442957X');
    assert.equal(normalizeIsbn('9780132350885'), null);
    assert.equal(normalizeIsbn('12345'), null);
    assert.equal(normalizeIsbn('abc'), null);
});

const stub = (search, edition, urls = []) => async (url) => {
    urls.push(url);
    return { ok: true, json: async () => (url.includes('search.json') ? { docs: search ? [search] : [] } : edition ? { 'ISBN:9780132350884': edition } : {}) };
};

test("Open Library's answer becomes title, authors, publisher and year", async () => {
    const urls = [];
    const edition = { title: 'Clean Code', subtitle: 'A Handbook of Agile Software Craftsmanship', publishers: [{ name: 'Prentice Hall' }], publish_date: 'August 2008' };
    assert.deepEqual(await lookupIsbn('9780132350884', stub({ title: 'Clean Code', author_name: ['Robert C. Martin', 'Dean Wampler', 'Robert C. Martin'] }, edition, urls)), {
        title: 'Clean Code: A Handbook of Agile Software Craftsmanship', authors: 'Robert C. Martin & Dean Wampler', publisher: 'Prentice Hall', year: '2008',
    });
    assert.ok(urls.every(u => u.startsWith('https://openlibrary.org/') && u.includes('9780132350884')));
    assert.equal(await lookupIsbn('9780132350884', stub(null, edition)), null);
    await assert.rejects(lookupIsbn('9780132350884', async () => ({ ok: false, status: 503 })), /HTTP 503/);
});

test('a spammed edition gives only the title and authors of the work', async () => {
    const spam = { title: 'Discount Code BONUS99 - 60% Off in 2026', publishers: [{ name: 'Discount Code' }], publish_date: '2026' };
    assert.deepEqual(await lookupIsbn('9780132350884', stub({ title: 'Clean Code', author_name: ['Robert C. Martin'] }, spam)), {
        title: 'Clean Code', authors: 'Robert C. Martin', publisher: '', year: '',
    });
});
