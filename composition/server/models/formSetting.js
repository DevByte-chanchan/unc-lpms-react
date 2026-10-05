'use strict';
// The ISO identity of a printed form (document control number, form revision, effectivity).
module.exports = (sequelize, DataTypes) => {
    const FormSetting = sequelize.define('FormSetting', {
        form_key: { type: DataTypes.STRING(30), primaryKey: true },
        doc_control_no: { type: DataTypes.STRING(30), allowNull: false },
        revision_no: { type: DataTypes.STRING(10), allowNull: false },
        effectivity: { type: DataTypes.STRING(10), allowNull: false },
        updated_by_name: { type: DataTypes.STRING(100), allowNull: true }
    }, { tableName: 'FormSettings' });
    return FormSetting;
};
