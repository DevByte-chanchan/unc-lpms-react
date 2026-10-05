'use strict';

const { FormSetting } = require('../models');
const { FORM_KEYS, validateFormSettingsInput, toApi } = require('../utils/formSettings');

// GET /api/form-settings — every signed-in user (exports read it)
async function getFormSettings(req, res, next) {
    try {
        const rows = await FormSetting.findAll();
        return res.json(Object.fromEntries(rows.map(row => [row.form_key, toApi(row)])));
    } catch (err) {
        return next(err);
    }
}

// PUT /api/form-settings/:formKey — the Dean updates a form's ISO revision / effectivity
async function updateFormSettings(req, res, next) {
    try {
        const { formKey } = req.params;
        if (!FORM_KEYS.includes(formKey)) return res.status(404).json({ message: 'Unknown form.' });
        const result = validateFormSettingsInput(req.body || {});
        if (!result.ok) return res.status(400).json({ message: result.errors.join(' '), errors: result.errors });

        const row = await FormSetting.findByPk(formKey);
        if (!row) return res.status(404).json({ message: 'Unknown form.' });
        await row.update({ ...result.value, updated_by_name: req.user?.name || null });
        return res.json(toApi(row));
    } catch (err) {
        return next(err);
    }
}

module.exports = { getFormSettings, updateFormSettings };
