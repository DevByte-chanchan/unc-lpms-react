'use strict';

// "Forgot password?" and the administrator's "Send password reset" (feature/course-assignment): a one-hour,
// single-use link. Only the SHA-256 of the token is kept; using one link retires the account's other links.
module.exports = (sequelize, DataTypes) => sequelize.define('PasswordReset', {
    password_reset_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    token_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used_at: { type: DataTypes.DATE, allowNull: true },
    requested_ip: { type: DataTypes.STRING(64), allowNull: true }
}, { tableName: 'PasswordResets' });
