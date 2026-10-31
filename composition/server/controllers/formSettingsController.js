'use strict';

const { FormSetting } = require('../models');
const { toApi } = require('../utils/formSettings');

// GET /api/form-settings — every signed-in user (exports read it)
async function getFormSettings(req, res, next) {
    try {
        const rows = await FormSetting.findAll();
        return res.json(Object.fromEntries(rows.map(row => [row.form_key, toApi(row)])));
    } catch (err) {
        return next(err);
    }
}

module.exports = { getFormSettings };
