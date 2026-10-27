'use strict';

const { CatalogSetting } = require('../models');
const { validateCatalogSettings, toApi } = require('../utils/catalogSettings');

const theRow = async () => (await CatalogSetting.findByPk(1)) || CatalogSetting.create({ id: 1 });

// GET /api/catalog-settings — every signed-in user (the picker and the review screens read it)
async function getCatalogSettings(req, res, next) {
    try {
        return res.json(toApi(await theRow()));
    } catch (err) {
        return next(err);
    }
}

// PUT /api/catalog-settings — the Director of Libraries changes the rules for everyone
async function updateCatalogSettings(req, res, next) {
    try {
        const result = validateCatalogSettings(req.body || {});
        if (!result.ok) return res.status(400).json({ message: result.errors.join(' '), errors: result.errors });
        const row = await theRow();
        await row.update({ ...result.value, updated_by_name: req.user?.name || null });
        return res.json(toApi(row));
    } catch (err) {
        return next(err);
    }
}

module.exports = { getCatalogSettings, updateCatalogSettings };
