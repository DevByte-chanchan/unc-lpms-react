'use strict';

// Field-level encryption for e-signature images: AES-256-GCM.
//
//   LPMS_SIGNATURE_KEY          32 random bytes, base64 (e.g. `openssl rand -base64 32`). No default.
//   LPMS_SIGNATURE_KEY_VERSION  integer stored with every file (default 1). Bump it when the key
//                               is rotated, then re-upload; files of another version are refused
//                               rather than mis-decrypted.
//
// A fresh random 12-byte IV is used for every file. The owner's user id is bound in as
// additional authenticated data, so a ciphertext copied onto another user's row fails to decrypt.

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// { key, version } when usable, otherwise { key: null, reason }.
const signatureKey = (env = process.env) => {
    const raw = String(env.LPMS_SIGNATURE_KEY || '').trim();
    if (!raw) return { key: null, reason: 'LPMS_SIGNATURE_KEY is not set.' };
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) return { key: null, reason: 'LPMS_SIGNATURE_KEY must be 32 bytes, base64-encoded.' };
    const version = Number.parseInt(env.LPMS_SIGNATURE_KEY_VERSION, 10);
    return { key, version: Number.isInteger(version) && version > 0 ? version : 1 };
};

const aadFor = (ownerId) => Buffer.from(`lpms-signature:user:${ownerId}`);

const encrypt = (plain, { key, version, ownerId }) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    cipher.setAAD(aadFor(ownerId));
    const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
    return { ciphertext, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), keyVersion: version };
};

// Throws if the data was tampered with, belongs to another user, or the key is wrong.
const decrypt = ({ ciphertext, iv, tag }, { key, ownerId }) => {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
    decipher.setAAD(aadFor(ownerId));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};

module.exports = { signatureKey, encrypt, decrypt };
