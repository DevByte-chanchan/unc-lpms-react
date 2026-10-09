'use strict';

// A user's own profile and e-signature. Every endpoint acts on req.user only: there is no way
// to name another user, so nobody (the superuser included) can read someone else's signature.
// Image bytes and their metadata are never written to the audit trail.

const { User } = require('../models');
const { signatureKey, encrypt } = require('../utils/crypto');
const { inspectImage } = require('../utils/imageInspect');
const { writeSignature, removeSignature, readSignature } = require('../utils/signatureStore');
const { record: audit } = require('../utils/audit');

const MAX_BYTES = 1024 * 1024;
const MIN_SIDE = 16;
const MAX_SIDE = 2000;

const KEY_UNAVAILABLE = { error: 'E-signature storage is not configured on this server.' };

const loadSelf = (req) => User.scope('withSecret').findByPk(req.user.id);

const auditSignature = (req, action, details) => audit({
    actor: req.user, action, entityType: 'users', entityId: req.user.id,
    details: { target_user_id: req.user.id, ...details }, ip: req.ip
});

const getProfile = async (req, res, next) => {
    try {
        const user = await loadSelf(req);
        if (!user) return res.status(401).json({ error: 'Authentication required.' });
        return res.json({
            name: user.name,
            email: user.email,
            role: user.role,
            hasSignature: Boolean(user.signature_path),
            signatureUpdatedAt: user.signature_updated_at
        });
    } catch (err) {
        return next(err);
    }
};

const putSignature = async (req, res, next) => {
    try {
        const { key, version } = signatureKey();
        if (!key) return res.status(503).json(KEY_UNAVAILABLE);

        const body = req.body;
        if (!Buffer.isBuffer(body) || body.length === 0) {
            return res.status(400).json({ error: 'Send the image as the request body (Content-Type image/png or image/jpeg).' });
        }
        if (body.length > MAX_BYTES) return res.status(413).json({ error: 'The image is larger than 1 MB.' });

        // What the bytes are decides, not the file name or the declared type.
        const image = inspectImage(body);
        if (!image) return res.status(415).json({ error: 'Only PNG or JPEG images are accepted.' });
        if (image.width < MIN_SIDE || image.height < MIN_SIDE || image.width > MAX_SIDE || image.height > MAX_SIDE) {
            return res.status(422).json({ error: `The image must be between ${MIN_SIDE} and ${MAX_SIDE} pixels on each side.` });
        }

        const user = await loadSelf(req);
        if (!user) return res.status(401).json({ error: 'Authentication required.' });

        const sealed = encrypt(body, { key, version, ownerId: user.user_id });
        const fileName = await writeSignature(sealed.ciphertext);
        const previous = user.signature_path;
        try {
            await user.update({
                signature_path: fileName,
                signature_mime: image.mime,
                signature_iv: sealed.iv,
                signature_tag: sealed.tag,
                signature_key_version: sealed.keyVersion,
                signature_updated_at: new Date()
            });
        } catch (error) {
            await removeSignature(fileName);
            throw error;
        }
        await removeSignature(previous);

        await auditSignature(req, previous ? 'SIGNATURE_REPLACED' : 'SIGNATURE_UPLOADED', {
            mime: image.mime, bytes: body.length, width: image.width, height: image.height, key_version: sealed.keyVersion
        });
        return res.status(previous ? 200 : 201).json({ hasSignature: true, signatureUpdatedAt: user.signature_updated_at });
    } catch (err) {
        return next(err);
    }
};

const getSignature = async (req, res, next) => {
    try {
        const user = await loadSelf(req);
        if (!user?.signature_path) return res.status(404).json({ error: 'No signature uploaded.' });
        let bytes;
        try {
            bytes = await readSignature(user);
        } catch (error) {
            if (error.code === 'NO_KEY') return res.status(503).json(KEY_UNAVAILABLE);
            if (error.code === 'KEY_VERSION') return res.status(409).json({ error: error.message });
            return res.status(500).json({ error: 'The signature could not be decrypted.' });
        }
        res.set({ 'Content-Type': user.signature_mime, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.send(bytes);
    } catch (err) {
        return next(err);
    }
};

const deleteSignature = async (req, res, next) => {
    try {
        const user = await loadSelf(req);
        if (!user?.signature_path) return res.status(404).json({ error: 'No signature uploaded.' });
        const previous = user.signature_path;
        await user.update({
            signature_path: null, signature_mime: null, signature_iv: null,
            signature_tag: null, signature_key_version: null, signature_updated_at: null
        });
        await removeSignature(previous);
        await auditSignature(req, 'SIGNATURE_REMOVED', {});
        return res.json({ hasSignature: false });
    } catch (err) {
        return next(err);
    }
};

module.exports = { getProfile, putSignature, getSignature, deleteSignature, MAX_BYTES };
