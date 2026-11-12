'use strict';

// Book details for an ISBN from Open Library (openlibrary.org), so a reference form can be filled from the ISBN.
// Only the ISBN is sent, from this server; nothing about the user. A wrong ISBN is refused before any request.
// Answers { title, authors, publisher, year } (empty strings where Open Library has nothing or cannot be trusted),
// or null when the book is not there. Throws when Open Library cannot be reached in time.

const TIMEOUT_MS = 8000;

// Hyphens and spaces dropped, X upper case; null unless it is a valid ISBN-10 or ISBN-13 (check digit included).
const normalizeIsbn = (value) => {
    const isbn = String(value || '').replace(/[\s-]/g, '').toUpperCase();
    if (/^\d{9}[\dX]$/.test(isbn)) {
        const sum = [...isbn].reduce((s, c, i) => s + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
        return sum % 11 === 0 ? isbn : null;
    }
    if (/^\d{13}$/.test(isbn)) {
        const sum = [...isbn].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0);
        return sum % 10 === 0 ? isbn : null;
    }
    return null;
};

// Open Library is edited by anyone, and some popular editions have been overwritten with spam (seen Nov 2026:
// Clean Code's edition titled as a discount-code advert). So the title and authors come from the search index (the
// work, which is cleaner), and the edition's own title, publisher and year are used only when its title matches the
// work; otherwise publisher and year stay empty for the person to fill. No work found = null.
const get = async (fetchFn, url) => {
    const res = await fetchFn(url, { headers: { 'User-Agent': 'LPMS reference lookup' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Open Library answered HTTP ${res.status}`);
    return res.json();
};

const lookupIsbn = async (isbn, fetchFn = fetch) => {
    const [search, editions] = await Promise.all([
        get(fetchFn, `https://openlibrary.org/search.json?isbn=${isbn}&fields=title,subtitle,author_name&limit=1`),
        get(fetchFn, `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`),
    ]);
    const work = search.docs?.[0];
    if (!work?.title) return null;
    const edition = editions[`ISBN:${isbn}`];
    const editionTitle = [edition?.title, edition?.subtitle].filter(Boolean).join(': ');
    const trusted = editionTitle.toLowerCase().includes(String(work.title).toLowerCase());
    return {
        title: trusted ? editionTitle : [work.title, work.subtitle].filter(Boolean).join(': '),
        authors: [...new Set(work.author_name || [])].join(' & '),
        publisher: trusted ? (edition.publishers || []).map(p => p.name).filter(Boolean)[0] || '' : '',
        year: trusted ? (String(edition.publish_date || '').match(/\b(1[5-9]|20)\d{2}\b/) || [''])[0] : '',
    };
};

module.exports = { normalizeIsbn, lookupIsbn };
