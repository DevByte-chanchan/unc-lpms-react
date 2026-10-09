'use strict';

// Identify an image from its bytes, never from a file name or Content-Type header.
// Returns { mime, width, height } for a well-formed PNG or JPEG header, otherwise null.

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
// JPEG start-of-frame markers (those that carry the dimensions).
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

const inspectPng = (buf) => {
    if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
    if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
    return { mime: 'image/png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
};

const inspectJpeg = (buf) => {
    if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return null;
    let i = 2;
    while (i + 3 < buf.length) {
        if (buf[i] !== 0xff) return null;
        while (buf[i + 1] === 0xff) i += 1; // fill bytes
        const marker = buf[i + 1];
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
        const length = buf.readUInt16BE(i + 2);
        if (SOF.has(marker)) {
            if (i + 9 > buf.length) return null;
            return { mime: 'image/jpeg', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        }
        if (marker === 0xd9 || marker === 0xda) return null; // end / start of scan before any frame header
        i += 2 + length;
    }
    return null;
};

const inspectImage = (buf) => (Buffer.isBuffer(buf) ? inspectPng(buf) || inspectJpeg(buf) : null);

module.exports = { inspectImage };
