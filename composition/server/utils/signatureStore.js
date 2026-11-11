'use strict';

// Encrypted signature files on disk. They live outside any served directory (the server serves
// no static files at all) under a random name; the only way to read one is the owner-only
// endpoint or an approver export, which decrypt it in memory.
//
//   LPMS_SIGNATURE_DIR   default: <server>/storage/signatures

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { signatureKey, decrypt } = require('./crypto');

const FILE_NAME = /^[0-9a-f]{32}\.sig$/;

const signatureDir = (env = process.env) => path.resolve(env.LPMS_SIGNATURE_DIR || path.join(__dirname, '..', 'storage', 'signatures'));

const fileFor = (name) => {
    if (!FILE_NAME.test(String(name || ''))) throw new Error('Invalid signature file name.');
    return path.join(signatureDir(), name);
};

const writeSignature = async (ciphertext) => {
    const name = `${crypto.randomBytes(16).toString('hex')}.sig`;
    await fs.promises.mkdir(signatureDir(), { recursive: true });
    await fs.promises.writeFile(fileFor(name), ciphertext, { flag: 'wx', mode: 0o600 });
    return name;
};

const removeSignature = async (name) => {
    if (!name) return;
    try { await fs.promises.unlink(fileFor(name)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
};

// Decrypted image bytes for a user row (loaded withSecret), or throws.
const readSignature = async (user, env = process.env) => {
    const { key, version, reason } = signatureKey(env);
    if (!key) throw Object.assign(new Error(reason), { code: 'NO_KEY' });
    if (user.signature_key_version !== version) {
        throw Object.assign(new Error('This signature was encrypted with another key version. Upload it again.'), { code: 'KEY_VERSION' });
    }
    const ciphertext = await fs.promises.readFile(fileFor(user.signature_path));
    return decrypt({ ciphertext, iv: user.signature_iv, tag: user.signature_tag }, { key, ownerId: user.user_id });
};

// data: URI for embedding in an export, or null when it cannot be produced (never throws).
const readSignatureDataUri = async (user, env = process.env) => {
    if (!user?.signature_path) return null;
    try {
        const bytes = await readSignature(user, env);
        return `data:${user.signature_mime};base64,${bytes.toString('base64')}`;
    } catch {
        return null;
    }
};

module.exports = { signatureDir, writeSignature, removeSignature, readSignature, readSignatureDataUri };
