'use strict';

// "You have been given access, set your password" (feature/course-assignment). One row per invitation e-mailed
// to an account. Only the SHA-256 of the link token is kept, and only while the link is live; a newer invitation
// cancels the older unaccepted ones, so an old link stops working.
//   status: sent | failed | cancelled | accepted
module.exports = (sequelize, DataTypes) => sequelize.define('AccountInvitation', {
    account_invitation_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false },
    sent_by_user_id: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'sent' },
    last_error: { type: DataTypes.STRING(255), allowNull: true },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    token_hash: { type: DataTypes.STRING(64), allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'AccountInvitations' });
