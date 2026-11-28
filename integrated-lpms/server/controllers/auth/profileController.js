'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../../models');

const SIG_DIR = path.resolve(__dirname, '../../uploads/signatures');

function ensureSigDir() {
  if (!fs.existsSync(SIG_DIR)) fs.mkdirSync(SIG_DIR, { recursive: true });
}

function getSigKey() {
  const hex = process.env.SIGNATURE_ENC_KEY_V1 || crypto.createHash('sha256').update('unc-lpms-dev-sig-key-v1').digest('hex');
  return Buffer.from(hex.slice(0, 64), 'hex');
}

exports.getProfile = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    const data = user.toJSON();
    data.hasSignature = Boolean(user.signature_path);
    return res.json({ profile: data, user: data });
  } catch (err) {
    return next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.user_id);
    if (!user) return res.status(404).json({ error: 'Profile not found.' });
    const updates = {};
    if (req.body?.name) updates.name = String(req.body.name).trim();
    if (req.body?.privacy_consent_version) {
      updates.privacy_consent_version = String(req.body.privacy_consent_version);
      updates.privacy_consented_at = new Date();
    }
    await user.update(updates);
    return res.json({ profile: user.toJSON(), user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
};

exports.uploadSignature = async (req, res, next) => {
  try {
    let buffer = req.file?.buffer || null;
    let mime = req.file?.mimetype || 'image/png';

    if (!buffer && req.body?.dataUrl) {
      const m = String(req.body.dataUrl).match(/^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/);
      if (!m) return res.status(400).json({ error: 'Invalid signature image data URL.' });
      mime = m[1];
      buffer = Buffer.from(m[2], 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Signature image file or base64 dataUrl is required.' });
    }

    ensureSigDir();
    const key = getSigKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    const filename = `sig_user_${req.user.user_id}.enc`;
    const filePath = path.join(SIG_DIR, filename);
    fs.writeFileSync(filePath, encrypted);

    await db.User.update({
      signature_path: filename,
      signature_iv: iv.toString('hex'),
      signature_tag: tag.toString('hex'),
      signature_mime: mime,
      signature_key_version: 1,
      signature_uploaded_at: new Date(),
    }, { where: { user_id: req.user.user_id } });

    return res.json({ ok: true, hasSignature: true, uploadedAt: new Date().toISOString() });
  } catch (err) {
    return next(err);
  }
};

exports.getSignature = async (req, res, next) => {
  try {
    const targetId = Number(req.params.userId || req.user.user_id);
    const user = await db.User.findByPk(targetId);
    if (!user || !user.signature_path) {
      return res.status(404).json({ error: 'No signature uploaded.' });
    }
    const filePath = path.join(SIG_DIR, path.basename(user.signature_path));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Signature file missing.' });
    }
    const encrypted = fs.readFileSync(filePath);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getSigKey(),
      Buffer.from(user.signature_iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(user.signature_tag, 'hex'));
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    res.setHeader('Content-Type', user.signature_mime || 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(plain);
  } catch (err) {
    return next(err);
  }
};

exports.deleteSignature = async (req, res, next) => {
  try {
    const user = await db.User.findByPk(req.user.user_id);
    if (user?.signature_path) {
      const filePath = path.join(SIG_DIR, path.basename(user.signature_path));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.User.update({
      signature_path: null,
      signature_iv: null,
      signature_tag: null,
      signature_mime: null,
      signature_uploaded_at: null,
    }, { where: { user_id: req.user.user_id } });
    return res.json({ ok: true, hasSignature: false });
  } catch (err) {
    return next(err);
  }
};
